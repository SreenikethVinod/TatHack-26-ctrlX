import express, { Request, Response, Router } from 'express';
import { db, User } from './db.ts';
import { db as rawDb } from './db/connection.ts';
import { calculatePriorityScore, ComplaintCategory, PriorityLevel } from './services/priorityService.ts';
import { authService, SystemRole } from './services/authService.ts';
import { lifecycleService } from './services/lifecycleService.ts';
import { escalationEngine } from './services/escalationEngine.ts';
import { duplicateService } from './services/duplicateService.ts';
import { planningService } from './services/planningService.ts';
import { evidenceService } from './services/evidenceService.ts';
import { analyticsService } from './services/analyticsService.ts';
import { authMiddleware, requireRole, resolveUserFromRequest } from './middleware/authMiddleware.ts';

export const apiRouter = Router();

// Apply auth middleware to resolve request user
apiRouter.use(authMiddleware);

// ==========================================
// 1. HEALTH & CORE STATUS
// ==========================================
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'CivicPulse Municipal Platform',
    version: '2.0.0-production',
    database: 'SQLite 3 (WAL mode with relational foreign keys)',
    scheduler: 'Active in-process accountability escalation engine',
  });
});

// ==========================================
// 2. AUTHENTICATION & PERSONA SWITCHER
// ==========================================
apiRouter.get('/auth/users', (_req: Request, res: Response) => {
  const users = db.getUsers();
  res.json({ users });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = req.user || resolveUserFromRequest(req);
  res.json({ user });
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, role, department, locality, avatarUrl } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    const result = authService.register({
      name,
      email,
      password,
      role: role as SystemRole,
      department,
      locality,
      avatarUrl,
    });
    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = authService.login(email, password);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// ==========================================
// 3. COMPLAINTS LIST, SEARCH & TRACKING
// ==========================================
apiRouter.get('/complaints', (req: Request, res: Response) => {
  try {
    const { category, status, priority, department, locality, search, reporterId } = req.query;
    const complaints = db.getComplaints({
      category: category as string,
      status: status as string,
      priority: priority as string,
      department: department as string,
      locality: locality as string,
      search: search as string,
      reporterId: reporterId as string,
    });

    const activeUser = req.user || resolveUserFromRequest(req);
    const enriched = complaints.map((c) => ({
      ...c,
      hasUserVoted: db.hasUserVoted(c.id, activeUser.id),
    }));

    res.json({ complaints: enriched, count: enriched.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve complaints', details: err.message });
  }
});

// Track complaint by reference ID (public-safe view, sanitizes internal info)
apiRouter.get('/complaints/track/:reference', (req: Request, res: Response) => {
  const { reference } = req.params;
  const complaint = db.getComplaintById(reference);

  if (!complaint) {
    return res.status(404).json({
      error: 'Complaint not found',
      message: `No civic complaint found with reference or ID "${reference}". Please verify the code (e.g., CP-2026-001).`,
    });
  }

  const history = db.getComplaintHistory(complaint.id);
  const activeUser = req.user || resolveUserFromRequest(req);
  const isOfficial = activeUser.role === 'official' || activeUser.role === 'admin';
  const notes = db.getComplaintNotes(complaint.id, isOfficial);

  res.json({
    complaint: {
      ...complaint,
      hasUserVoted: db.hasUserVoted(complaint.id, activeUser.id),
    },
    history,
    notes,
  });
});

// Get complaint by ID
apiRouter.get('/complaints/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const complaint = db.getComplaintById(id);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const history = db.getComplaintHistory(complaint.id);
  const activeUser = req.user || resolveUserFromRequest(req);
  const isOfficial = activeUser.role === 'official' || activeUser.role === 'admin';
  const notes = db.getComplaintNotes(complaint.id, isOfficial);

  res.json({
    complaint: {
      ...complaint,
      hasUserVoted: db.hasUserVoted(complaint.id, activeUser.id),
    },
    history,
    notes,
  });
});

// Retrieve detailed timeline
apiRouter.get('/complaints/:id/timeline', (req: Request, res: Response) => {
  const { id } = req.params;
  const complaint = db.getComplaintById(id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const history = db.getComplaintHistory(complaint.id);
  res.json({ complaintId: complaint.id, reference: complaint.reference, timeline: history });
});

// Create new civic complaint
apiRouter.post('/complaints', (req: Request, res: Response) => {
  try {
    const { title, description, category, address, locality, latitude, longitude, imageUrl, safetyRisk } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      return res.status(400).json({ error: 'Title is required and must be at least 5 characters.' });
    }
    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ error: 'Detailed description is required (at least 10 characters).' });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Valid complaint category must be selected.' });
    }
    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      return res.status(400).json({ error: 'Location address or landmark is required.' });
    }

    const activeUser = req.user || resolveUserFromRequest(req);

    const created = db.createComplaint({
      title,
      description,
      category: category as ComplaintCategory,
      address,
      locality: locality || 'Metro District',
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      imageUrl: imageUrl || undefined,
      safetyRisk: Boolean(safetyRisk),
      reporterId: activeUser.id,
      reporterName: activeUser.name,
    });

    res.status(201).json({
      success: true,
      complaint: created,
      message: `Civic complaint successfully registered with Reference ID ${created.reference}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record complaint', details: err.message });
  }
});

// Update complaint status (Authorized Official / Admin only)
apiRouter.patch(
  '/complaints/:id/status',
  requireRole('official', 'admin', 'PANCHAYAT_OFFICER', 'SUPERVISOR', 'DISTRICT_REVIEWER', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, publicUpdate, resolutionSummary, afterImageUrl } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Target status is required.' });
    }

    const activeUser = req.user || resolveUserFromRequest(req);

    try {
      const result = lifecycleService.transitionStatus({
        complaintId: id,
        targetStatus: status,
        actor: {
          id: activeUser.id,
          name: activeUser.name,
          role: activeUser.role === 'official' ? 'Municipal Official' : 'System Admin',
          systemRole: activeUser.systemRole,
        },
        publicUpdate,
        resolutionSummary,
        afterImageUrl,
      });

      const updatedComplaint = db.getComplaintById(id);

      res.json({
        success: true,
        complaint: updatedComplaint,
        historyEntry: {
          id: result.historyEntry.id,
          complaintId: result.historyEntry.complaint_id,
          previousStatus: result.historyEntry.previous_status,
          newStatus: result.historyEntry.new_status,
          actorId: result.historyEntry.actor_id,
          actorName: result.historyEntry.actor_name,
          actorRole: result.historyEntry.actor_role,
          publicUpdate: result.historyEntry.public_update,
          timestamp: result.historyEntry.timestamp,
        },
        message: `Status updated to "${status}".`,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Update priority override (Authorized Official / Admin only)
apiRouter.patch(
  '/complaints/:id/priority',
  requireRole('official', 'admin', 'PANCHAYAT_OFFICER', 'SUPERVISOR', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { priority, overrideReason } = req.body;

    const validPriorities: PriorityLevel[] = ['Low', 'Medium', 'High', 'Critical'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level.' });
    }
    if (!overrideReason || typeof overrideReason !== 'string' || overrideReason.trim().length < 5) {
      return res.status(400).json({ error: 'An official justification note is required to override priority.' });
    }

    const activeUser = req.user || resolveUserFromRequest(req);
    const updated = db.updatePriority({
      complaintId: id,
      priority,
      overrideReason,
      actor: activeUser,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    res.json({
      success: true,
      complaint: updated,
      message: `Priority updated to "${priority}" with official rationale logged.`,
    });
  }
);

// Re-assign department (Official / Admin only)
apiRouter.patch(
  '/complaints/:id/assignment',
  requireRole('official', 'admin', 'PANCHAYAT_OFFICER', 'SUPERVISOR', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { department, note } = req.body;

    if (!department || typeof department !== 'string') {
      return res.status(400).json({ error: 'Target department is required.' });
    }

    const activeUser = req.user || resolveUserFromRequest(req);
    const updated = db.updateAssignment({
      complaintId: id,
      department,
      actor: activeUser,
      note,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    res.json({
      success: true,
      complaint: updated,
      message: `Assigned department routed to "${department}".`,
    });
  }
);

// Community upvote
apiRouter.post('/complaints/:id/votes', (req: Request, res: Response) => {
  const { id } = req.params;
  const activeUser = req.user || resolveUserFromRequest(req);

  const result = db.voteComplaint({
    complaintId: id,
    userId: activeUser.id,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Audit history endpoint
apiRouter.get('/complaints/:id/history', (req: Request, res: Response) => {
  const { id } = req.params;
  const history = db.getComplaintHistory(id);
  res.json({ history });
});

// Add official note
apiRouter.post(
  '/complaints/:id/notes',
  requireRole('official', 'admin', 'PANCHAYAT_OFFICER', 'SUPERVISOR', 'DISTRICT_REVIEWER', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { note, visibility } = req.body;

    if (!note || typeof note !== 'string' || note.trim().length < 3) {
      return res.status(400).json({ error: 'Note text cannot be empty.' });
    }

    const activeUser = req.user || resolveUserFromRequest(req);
    const createdNote = db.addOfficialNote({
      complaintId: id,
      author: activeUser,
      note,
      visibility: visibility === 'public' ? 'public' : 'internal',
    });

    res.status(201).json({ success: true, note: createdNote });
  }
);

// ==========================================
// 4. ACCOUNTABILITY & ESCALATION ENGINE
// ==========================================
// Record meaningful action (qualifying substantive action resets accountability timer)
apiRouter.post(
  '/complaints/:id/actions',
  requireRole('official', 'admin', 'PANCHAYAT_OFFICER', 'SUPERVISOR', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { actionType, description, nextActionDeadlineHours } = req.body;

    const validActionTypes = [
      'OFFICER_ASSIGNED',
      'INSPECTION_SCHEDULED',
      'INSPECTION_COMPLETED',
      'WORK_ORDER_CREATED',
      'REPAIR_STARTED',
      'SUBSTANTIVE_UPDATE',
      'BLOCKER_RECORDED',
    ];

    if (!validActionTypes.includes(actionType)) {
      return res.status(400).json({
        error: `Invalid action type. Must be one of: ${validActionTypes.join(', ')}`,
      });
    }

    const activeUser = req.user || resolveUserFromRequest(req);

    try {
      const updated = escalationEngine.recordMeaningfulAction({
        complaintId: id,
        actionType,
        description,
        nextActionDeadlineHours: Number(nextActionDeadlineHours) || undefined,
        actor: {
          id: activeUser.id,
          name: activeUser.name,
          role: activeUser.role,
          department: activeUser.department,
        },
      });

      res.json({
        success: true,
        complaint: updated,
        message: 'Substantive action recorded. Accountability deadline reset successfully.',
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Record blocker
apiRouter.post(
  '/complaints/:id/blocker',
  requireRole('official', 'admin', 'PANCHAYAT_OFFICER', 'SUPERVISOR', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, responsibleParty, nextReviewDate } = req.body;

    const activeUser = req.user || resolveUserFromRequest(req);

    try {
      const updated = escalationEngine.recordBlocker({
        complaintId: id,
        actor: {
          id: activeUser.id,
          name: activeUser.name,
          role: activeUser.role,
          department: activeUser.department,
        },
        reason,
        responsibleParty,
        nextReviewDate,
      });

      res.json({
        success: true,
        complaint: updated,
        message: 'Blocker registered. Scheduled review date locked into accountability calendar.',
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// List escalations
apiRouter.get(
  '/escalations',
  requireRole('official', 'admin', 'SUPERVISOR', 'DISTRICT_REVIEWER', 'ADMIN'),
  (req: Request, res: Response) => {
    const { status, level, department } = req.query;
    let sql = `
      SELECT e.*, c.reference, c.title, c.category, c.priority, c.address, c.locality
      FROM escalations e
      JOIN complaints c ON e.complaint_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND e.escalation_status = ?';
      params.push(status);
    }
    if (level && level !== 'all') {
      sql += ' AND e.escalation_level = ?';
      params.push(Number(level));
    }
    if (department && department !== 'all') {
      sql += ' AND e.source_department = ?';
      params.push(department);
    }

    sql += ' ORDER BY datetime(e.created_at) DESC';
    const rows = rawDb.prepare(sql).all(...params);
    res.json({ escalations: rows, count: rows.length });
  }
);

// District Review Queue (Authorized District Reviewers & Admins)
apiRouter.get(
  '/escalations/district-queue',
  requireRole('admin', 'DISTRICT_REVIEWER', 'ADMIN'),
  (_req: Request, res: Response) => {
    const rows = rawDb
      .prepare(
        `SELECT e.*, c.reference, c.title, c.category, c.priority, c.address, c.locality,
                c.created_at as complaint_created_at, c.inactivity_cycle
         FROM escalations e
         JOIN complaints c ON e.complaint_id = c.id
         WHERE e.escalation_level = 3 AND e.escalation_status != 'CLOSED'
         ORDER BY datetime(e.created_at) ASC`
      )
      .all();
    res.json({ districtQueue: rows, count: rows.length });
  }
);

// Update escalation status (District review workflow)
apiRouter.patch(
  '/escalations/:id/status',
  requireRole('admin', 'DISTRICT_REVIEWER', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { escalationStatus, reviewOutcome, followUpActions } = req.body;

    const validStatuses = [
      'PENDING_REVIEW',
      'ASSIGNED',
      'UNDER_REVIEW',
      'ACTION_REQUIRED',
      'RETURNED_TO_PANCHAYAT',
      'CLOSED',
    ];

    if (!validStatuses.includes(escalationStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const activeUser = req.user || resolveUserFromRequest(req);
    const now = new Date().toISOString();

    const existing = rawDb.prepare('SELECT * FROM escalations WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Escalation record not found.' });

    const tx = rawDb.transaction(() => {
      rawDb
        .prepare(
          `UPDATE escalations SET
            escalation_status = ?,
            assigned_district_reviewer_id = ?,
            review_outcome = ?,
            follow_up_actions = ?,
            updated_at = ?
           WHERE id = ?`
        )
        .run(
          escalationStatus,
          activeUser.id,
          reviewOutcome || null,
          followUpActions || null,
          now,
          id
        );

      if (escalationStatus === 'RETURNED_TO_PANCHAYAT') {
        rawDb
          .prepare(
            `UPDATE complaints SET status = 'In Progress', inactivity_cycle = 0, updated_at = ? WHERE id = ?`
          )
          .run(now, existing.complaint_id);
      }
    });

    tx();

    const updated = rawDb.prepare('SELECT * FROM escalations WHERE id = ?').get(id);
    res.json({ success: true, escalation: updated });
  }
);

// Trigger scheduled escalation worker on-demand
apiRouter.post('/escalations/run-worker', (_req: Request, res: Response) => {
  const result = escalationEngine.runEscalationWorker();
  res.json({ success: true, result });
});

// ==========================================
// 5. DUPLICATE DETECTION & MERGING
// ==========================================
apiRouter.get('/complaints/:id/duplicates', (req: Request, res: Response) => {
  const { id } = req.params;
  const matches = duplicateService.findPotentialDuplicates(id);
  res.json({ complaintId: id, duplicates: matches, count: matches.length });
});

apiRouter.post(
  '/complaints/:id/duplicates/link',
  requireRole('official', 'admin', 'PANCHAYAT_OFFICER', 'SUPERVISOR', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { canonicalComplaintId, confidenceScore, reason } = req.body;

    if (!canonicalComplaintId) {
      return res.status(400).json({ error: 'canonicalComplaintId is required.' });
    }

    const activeUser = req.user || resolveUserFromRequest(req);
    const link = duplicateService.linkDuplicate({
      complaintId: id,
      canonicalComplaintId,
      confidenceScore: Number(confidenceScore) || 0.75,
      reason: reason || 'Detected similar geographic and category report.',
      actorId: activeUser.id,
    });

    res.status(201).json({ success: true, link });
  }
);

apiRouter.post(
  '/duplicates/:linkId/confirm',
  requireRole('official', 'admin', 'SUPERVISOR', 'ADMIN'),
  (req: Request, res: Response) => {
    const { linkId } = req.params;
    const activeUser = req.user || resolveUserFromRequest(req);

    try {
      const result = duplicateService.confirmDuplicate(linkId, activeUser.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// ==========================================
// 6. RESOURCE-CONSTRAINED MAINTENANCE PLANNING
// ==========================================
apiRouter.post(
  '/planning/generate',
  requireRole('official', 'admin', 'SUPERVISOR', 'ADMIN'),
  (req: Request, res: Response) => {
    try {
      const { budgetLimit, crewCount, hoursPerCrew, department, category } = req.body;
      const activeUser = req.user || resolveUserFromRequest(req);

      const plan = planningService.generatePlan({
        budgetLimit: Number(budgetLimit) || 15000,
        crewCount: Number(crewCount) || 4,
        hoursPerCrew: Number(hoursPerCrew) || 40,
        department,
        category,
        createdByUserId: activeUser.id,
      });

      res.status(201).json({ success: true, plan });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

apiRouter.get(
  '/planning/:id',
  requireRole('official', 'admin', 'SUPERVISOR', 'DISTRICT_REVIEWER', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const details = planningService.getPlanById(id);
    if (!details) return res.status(404).json({ error: 'Maintenance plan not found.' });
    res.json(details);
  }
);

apiRouter.get(
  '/planning',
  requireRole('official', 'admin', 'SUPERVISOR', 'DISTRICT_REVIEWER', 'ADMIN'),
  (_req: Request, res: Response) => {
    const plans = rawDb
      .prepare('SELECT * FROM maintenance_plans ORDER BY datetime(created_at) DESC LIMIT 20')
      .all();
    res.json({ plans });
  }
);

// ==========================================
// 7. RESOLUTION EVIDENCE & VERIFICATION
// ==========================================
// Submit evidence (supports base64 payload or raw buffer)
apiRouter.post('/complaints/:id/evidence', (req: Request, res: Response) => {
  const { id } = req.params;
  const { evidenceType, fileBase64, filename } = req.body;

  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return res.status(400).json({ error: 'fileBase64 data is required.' });
  }

  // Strip possible dataURL prefix
  const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const activeUser = req.user || resolveUserFromRequest(req);

  try {
    const saved = evidenceService.saveEvidence({
      complaintId: id,
      evidenceType: evidenceType === 'resolution' ? 'resolution' : 'initial',
      originalFilename: filename || 'evidence.jpg',
      buffer,
      uploadedByUserId: activeUser.id,
    });

    res.status(201).json({ success: true, evidence: saved });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Serve evidence image securely
apiRouter.get('/evidence/:id/file', (req: Request, res: Response) => {
  const { id } = req.params;
  const fileInfo = evidenceService.getEvidenceFile(id);

  if (!fileInfo) {
    return res.status(404).json({ error: 'Evidence file not found.' });
  }

  res.setHeader('Content-Type', fileInfo.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(fileInfo.path);
});

// Verify or reject resolution evidence (Supervisor / Admin)
apiRouter.post(
  '/evidence/:id/verify',
  requireRole('official', 'admin', 'SUPERVISOR', 'DISTRICT_REVIEWER', 'ADMIN'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { decision, reason, notes } = req.body;

    if (decision !== 'verified' && decision !== 'rejected') {
      return res.status(400).json({ error: 'Decision must be either "verified" or "rejected".' });
    }

    const activeUser = req.user || resolveUserFromRequest(req);

    try {
      const result = evidenceService.verifyEvidence({
        evidenceId: id,
        decision,
        reason,
        notes,
        reviewer: {
          id: activeUser.id,
          name: activeUser.name,
          role: activeUser.role,
        },
      });

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Reopen complaint with official reason
apiRouter.post('/complaints/:id/reopen', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'An explanation of at least 5 characters is required to reopen.' });
  }

  const activeUser = req.user || resolveUserFromRequest(req);

  try {
    const result = lifecycleService.transitionStatus({
      complaintId: id,
      targetStatus: 'Reopened',
      reason,
      actor: {
        id: activeUser.id,
        name: activeUser.name,
        role: activeUser.role,
      },
    });

    res.json({
      success: true,
      complaint: result.complaint,
      message: 'Complaint successfully reopened for corrective resolution.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 8. TRANSPARENCY & ACCOUNTABILITY ANALYTICS
// ==========================================
apiRouter.get('/analytics', (_req: Request, res: Response) => {
  const analytics = analyticsService.getMunicipalAnalytics();
  res.json(analytics);
});

apiRouter.get('/analytics/accountability', (_req: Request, res: Response) => {
  const data = analyticsService.getAccountabilityAnalytics();
  res.json(data);
});

// ==========================================
// 9. SLA POLICIES
// ==========================================
apiRouter.get('/policies/sla', (_req: Request, res: Response) => {
  const policies = rawDb.prepare('SELECT * FROM sla_policies ORDER BY category, priority').all();
  res.json({ policies });
});

apiRouter.put('/policies/sla', requireRole('admin', 'ADMIN'), (req: Request, res: Response) => {
  const { category, priority, ackDeadlineHours, actionDeadlineHours } = req.body;
  if (!category || !priority || !ackDeadlineHours || !actionDeadlineHours) {
    return res.status(400).json({ error: 'Category, priority, and deadline hours are required.' });
  }

  const id = `sla-${category}-${priority}`;
  const now = new Date().toISOString();

  rawDb
    .prepare(
      `INSERT INTO sla_policies (id, category, priority, ack_deadline_hours, action_deadline_hours, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(category, priority) DO UPDATE SET
        ack_deadline_hours = excluded.ack_deadline_hours,
        action_deadline_hours = excluded.action_deadline_hours,
        updated_at = excluded.updated_at`
    )
    .run(id, category, priority, Number(ackDeadlineHours), Number(actionDeadlineHours), now, now);

  res.json({ success: true, message: 'SLA policy updated.' });
});

// ==========================================
// 10. DEMO RESET
// ==========================================
apiRouter.post('/reset-demo-data', (_req: Request, res: Response) => {
  const fresh = db.resetToSeed();
  res.json({
    success: true,
    message: 'Demo dataset reset to initial 16 verified complaints, audit history, and demo accounts.',
    complaintsCount: fresh.complaints.length,
  });
});
