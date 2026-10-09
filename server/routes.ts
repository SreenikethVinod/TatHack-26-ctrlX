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
import { notificationService } from './services/notificationService.ts';
import { wastePickupService } from './services/wastePickupService.ts';
import { authMiddleware, requireRole, resolveUserFromRequest } from './middleware/authMiddleware.ts';
import { aiRouter } from '../ai-module/index.ts';

export const apiRouter = Router();

// Modular AI forensics & severity engine routes
apiRouter.use('/ai', aiRouter);

// Apply auth middleware to resolve request user
apiRouter.use(authMiddleware);

function getAuthenticatedUser(req: Request): User {
  const user = req.user || resolveUserFromRequest(req);
  if (!user) {
    throw new Error('Authentication required. Please sign in to proceed.');
  }
  return user;
}

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
    let systemRole: SystemRole = 'CITIZEN';
    if (role) {
      const upper = String(role).toUpperCase();
      if (upper === 'CITIZEN') systemRole = 'CITIZEN';
      else if (upper === 'OFFICIAL' || upper === 'MUNICIPALITY' || upper === 'SUPERVISOR') systemRole = 'SUPERVISOR';
      else if (upper === 'ADMIN' || upper === 'DISTRICT') systemRole = 'ADMIN';
    }

    const result = authService.register({
      name,
      email,
      password,
      role: systemRole,
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
      hasUserVoted: activeUser ? db.hasUserVoted(c.id, activeUser.id) : false,
      isFollowing: activeUser ? db.isUserFollowing(c.id, activeUser.id) : false,
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
  const isOfficial = activeUser ? (activeUser.role === 'official' || activeUser.role === 'admin') : false;
  const notes = db.getComplaintNotes(complaint.id, isOfficial);

  res.json({
    complaint: {
      ...complaint,
      hasUserVoted: activeUser ? db.hasUserVoted(complaint.id, activeUser.id) : false,
      isFollowing: activeUser ? db.isUserFollowing(complaint.id, activeUser.id) : false,
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
  const isOfficial = activeUser ? (activeUser.role === 'official' || activeUser.role === 'admin') : false;
  const notes = db.getComplaintNotes(complaint.id, isOfficial);

  res.json({
    complaint: {
      ...complaint,
      hasUserVoted: activeUser ? db.hasUserVoted(complaint.id, activeUser.id) : false,
      isFollowing: activeUser ? db.isUserFollowing(complaint.id, activeUser.id) : false,
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
    const {
      title,
      description,
      category,
      address,
      locality,
      latitude,
      longitude,
      imageUrl,
      safetyRisk,
      photoFingerprint,
      photoMetadata,
      photoDistanceMeters,
      isFlaggedLocationMismatch,
      locationMatchStatus,
    } = req.body;

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
    if (!activeUser) {
      return res.status(401).json({ error: 'Please sign in to submit a complaint.' });
    }

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
      photoFingerprint: photoFingerprint || null,
      photoMetadata: photoMetadata || null,
      photoDistanceMeters: typeof photoDistanceMeters === 'number' ? photoDistanceMeters : null,
      isFlaggedLocationMismatch: Boolean(isFlaggedLocationMismatch),
      locationMatchStatus: locationMatchStatus || undefined,
    });

    let message = `Civic complaint successfully registered with Reference ID ${created.reference}.`;
    if (created.isMerged && created.mergedWithReference) {
      message = `Spatial Auto-Merge: A matching report (${created.mergedWithReference}) was detected ~50m away across the road. Both reports are merged to elevate community priority and prevent duplicate contractor payouts!`;
    }
    if (created.isFlaggedLocationMismatch) {
      message += ` (Location discrepancy flagged: photo was captured ${created.photoDistanceMeters || 0}m away from the specified location).`;
    }

    res.status(201).json({
      success: true,
      complaint: created,
      autoMerged: Boolean(created.isMerged && created.mergedWithReference),
      canonicalReference: created.mergedWithReference || null,
      message,
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
    const { status, publicUpdate, resolutionSummary, afterImageUrl, reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Target status is required.' });
    }

    try {
      const activeUser = getAuthenticatedUser(req);
      const result = lifecycleService.transitionStatus({
        complaintId: id,
        targetStatus: status,
        actor: {
          id: activeUser.id,
          name: activeUser.name,
          role: activeUser.role === 'official' ? 'Municipal Official' : 'System Admin',
          systemRole: activeUser.systemRole,
        },
        reason: reason || publicUpdate,
        publicUpdate: publicUpdate || reason,
        resolutionSummary,
        afterImageUrl,
      });

      const updatedComplaint = db.getComplaintById(id);

      // Notify all followers (and followers of merged reports) about this status update
      try {
        notificationService.notifyFollowers({
          complaintId: id,
          type: 'STATUS_UPDATE',
          title: `Status: ${status}`,
          message: `Report ${updatedComplaint?.reference || id} was updated to "${status}". ${publicUpdate || reason || resolutionSummary || ''}`.trim(),
          excludeUserId: activeUser.id,
        });
      } catch (e) {
        console.warn('Failed to notify followers for status change:', e);
      }

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

// Formally Acknowledge Complaint (Municipality Admin / District Admin)
apiRouter.post('/complaints/:id/acknowledge', (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const activeUser = req.user || resolveUserFromRequest(req);
  if (!activeUser) {
    return res.status(401).json({ error: 'Please sign in to acknowledge complaints.' });
  }

  try {
    const updated = db.acknowledgeComplaint({
      complaintId: id,
      actor: activeUser,
      notes,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    res.json({
      success: true,
      complaint: updated,
      message: `Report ${updated.reference} officially acknowledged by ${activeUser.name}. 14-day statutory breach prevented.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to acknowledge report', details: err.message });
  }
});

// Assign task to workers along with the budget required to fix the issue
apiRouter.post('/complaints/:id/assign', (req: Request, res: Response) => {
  const { id } = req.params;
  const { worker, budget, budgetNotes } = req.body;

  if (!worker || typeof worker !== 'string' || worker.trim().length < 2) {
    return res.status(400).json({ error: 'Assigned worker or crew name is required.' });
  }

  const parsedBudget = Number(budget);
  if (isNaN(parsedBudget) || parsedBudget < 0) {
    return res.status(400).json({ error: 'A valid estimated budget amount is required (must be 0 or greater).' });
  }

  const activeUser = req.user || resolveUserFromRequest(req);
  if (!activeUser) {
    return res.status(401).json({ error: 'Please sign in to assign tasks.' });
  }

  try {
    const updated = db.assignWorkerAndBudget({
      complaintId: id,
      worker: worker.trim(),
      budget: parsedBudget,
      budgetNotes: typeof budgetNotes === 'string' ? budgetNotes.trim() : undefined,
      actor: activeUser,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    res.json({
      success: true,
      complaint: updated,
      message: `Task successfully assigned to "${worker.trim()}" with an approved budget of $${parsedBudget.toLocaleString()}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to assign worker and budget', details: err.message });
  }
});

// Get District Escalations (> 14 days unacknowledged or escalated)
apiRouter.get('/district/escalations', (_req: Request, res: Response) => {
  try {
    const list = db.getEscalatedComplaints();
    res.json({
      success: true,
      escalations: list,
      count: list.length,
      policyNote: 'Reports unacknowledged by the municipal department for over 14 days are automatically routed to District Administration.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load district escalations', details: err.message });
  }
});

// District Admin Higher-Authority Executive Intervention
apiRouter.post('/complaints/:id/district-action', (req: Request, res: Response) => {
  const { id } = req.params;
  const { actionType, directiveText, worker, emergencyBudget } = req.body;

  if (!directiveText || typeof directiveText !== 'string' || directiveText.trim().length < 5) {
    return res.status(400).json({ error: 'Executive directive explanation is required (min 5 chars).' });
  }

  const activeUser = req.user || resolveUserFromRequest(req);
  if (!activeUser) {
    return res.status(401).json({ error: 'Please sign in to apply district actions.' });
  }

  try {
    const updated = db.districtIntervene({
      complaintId: id,
      actionType: actionType || 'FORMAL_DIRECTIVE',
      directiveText: directiveText.trim(),
      worker: worker ? String(worker).trim() : undefined,
      emergencyBudget: emergencyBudget ? Number(emergencyBudget) : undefined,
      actor: activeUser,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    res.json({
      success: true,
      complaint: updated,
      message: 'District executive intervention applied successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to apply district intervention', details: err.message });
  }
});

// Test/Demo Helper: Create sample 15-day unacknowledged report to test 14-day rule
apiRouter.post('/complaints/simulate-overdue', (req: Request, res: Response) => {
  const activeUser = req.user || resolveUserFromRequest(req);
  try {
    const complaint = db.createTestOverdueReport({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      address: req.body.address,
      daysAged: req.body.daysAged ? Number(req.body.daysAged) : 15,
      actor: activeUser || undefined,
    });

    res.status(201).json({
      success: true,
      complaint,
      message: `Simulated report ${complaint.reference} created with age 15 days (unacknowledged). Automatically routed to District Admin.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to simulate overdue report', details: err.message });
  }
});

// Age a specific report by N days
apiRouter.post('/complaints/:id/age', (req: Request, res: Response) => {
  const { id } = req.params;
  const days = req.body.days ? Number(req.body.days) : 15;

  try {
    const updated = db.simulateAgeComplaint(id, days);
    if (!updated) return res.status(404).json({ error: 'Complaint not found.' });

    res.json({
      success: true,
      complaint: updated,
      message: `Complaint ${updated.reference} aged by ${days} days. ${updated.isEscalatedDistrict ? 'Automatically escalated to District Admin!' : ''}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to age complaint', details: err.message });
  }
});

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

    const activeUser = getAuthenticatedUser(req);
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

    const activeUser = getAuthenticatedUser(req);
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
  if (!activeUser) {
    return res.status(401).json({ error: 'Please sign in to vote or endorse complaints.' });
  }

  const result = db.voteComplaint({
    complaintId: id,
    userId: activeUser.id,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Follow / Unfollow Report
apiRouter.post('/complaints/:id/follow', (req: Request, res: Response) => {
  const { id } = req.params;
  const activeUser = req.user || resolveUserFromRequest(req);
  if (!activeUser) {
    return res.status(401).json({ error: 'Please sign in to follow complaints.' });
  }

  const result = db.toggleFollow(id, {
    id: activeUser.id,
    name: activeUser.name,
    email: activeUser.email,
  });

  res.json({
    success: true,
    complaintId: id,
    ...result,
  });
});

// Check if user is following report
apiRouter.get('/complaints/:id/follow-status', (req: Request, res: Response) => {
  const { id } = req.params;
  const activeUser = req.user || resolveUserFromRequest(req);

  const isFollowing = activeUser ? db.isUserFollowing(id, activeUser.id) : false;
  const followersCount = db.getFollowersCount(id);

  res.json({
    complaintId: id,
    isFollowing,
    followersCount,
  });
});

// Notifications list for active user
apiRouter.get('/notifications', (req: Request, res: Response) => {
  const activeUser = req.user || resolveUserFromRequest(req);
  if (!activeUser) {
    return res.json({ success: true, notifications: [], unreadCount: 0 });
  }
  const data = db.getNotifications(activeUser.id);
  res.json({
    success: true,
    ...data,
  });
});

// Mark single notification read
apiRouter.patch('/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const activeUser = req.user || resolveUserFromRequest(req);
  if (!activeUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  db.markNotificationRead(id, activeUser.id);
  res.json({ success: true, notificationId: id, read: true });
});

// Mark all notifications read
apiRouter.post('/notifications/mark-all-read', (req: Request, res: Response) => {
  const activeUser = req.user || resolveUserFromRequest(req);
  if (!activeUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  db.markAllNotificationsRead(activeUser.id);
  res.json({ success: true, message: 'All notifications marked as read.' });
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

    const activeUser = getAuthenticatedUser(req);
    const createdNote = db.addOfficialNote({
      complaintId: id,
      author: activeUser,
      note,
      visibility: visibility === 'public' ? 'public' : 'internal',
    });

    if (visibility === 'public') {
      try {
        notificationService.notifyFollowers({
          complaintId: id,
          type: 'OFFICIAL_NOTE',
          title: 'Official Note Added',
          message: `Official note posted by ${activeUser.name}: "${note.trim()}"`,
          excludeUserId: activeUser.id,
        });
      } catch (e) {
        console.warn('Failed to notify followers for note:', e);
      }
    }

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

    try {
      const activeUser = getAuthenticatedUser(req);
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

    try {
      const activeUser = getAuthenticatedUser(req);
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

    const activeUser = getAuthenticatedUser(req);
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

    const activeUser = getAuthenticatedUser(req);
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
    const activeUser = getAuthenticatedUser(req);

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
      const activeUser = getAuthenticatedUser(req);

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

  try {
    const activeUser = getAuthenticatedUser(req);
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

    try {
      const activeUser = getAuthenticatedUser(req);
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

  try {
    const activeUser = getAuthenticatedUser(req);
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
    message: 'Database wiped clean. 0 complaints and 0 users.',
    complaintsCount: 0,
  });
});

// ==========================================
// 11. REVERSE GEOCODING PROXY (Authentic Place Resolution)
// ==========================================
apiRouter.get('/geocode/reverse', async (req: Request, res: Response) => {
  const { lat, lng } = req.query;
  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'Valid lat and lng query parameters required.' });
  }

  try {
    // 1. Try OpenStreetMap Nominatim with authentic User-Agent header (works from server)
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const nominatimRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'CivicPulse-App/2.0 (civicpulse@localhost)',
        'Accept': 'application/json',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);

    if (nominatimRes && nominatimRes.ok) {
      const data = (await nominatimRes.json()) as any;
      const addr = data.address || {};

      const houseNumber = addr.house_number ? `${addr.house_number} ` : '';
      const road = addr.road || addr.street || addr.pedestrian || addr.residential || '';
      const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.subdivision || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Metro Area';
      const state = addr.state || '';
      const postcode = addr.postcode ? ` ${addr.postcode}` : '';

      let formattedAddress = '';
      if (road) {
        formattedAddress = `${houseNumber}${road}${suburb ? `, ${suburb}` : ''}, ${city}${state ? `, ${state}` : ''}${postcode}`;
      } else if (data.display_name) {
        formattedAddress = data.display_name.split(',').slice(0, 4).join(',').trim();
      } else {
        formattedAddress = `${suburb || 'Local Area'}, ${city}`;
      }

      const locality = suburb ? `${suburb}, ${city}` : city;

      return res.json({
        success: true,
        address: formattedAddress,
        locality,
        city,
        displayName: data.display_name || formattedAddress,
        latitude,
        longitude,
        source: 'nominatim',
      });
    }

    // 2. Secondary fallback: BigDataCloud reverse geocode API
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const bdcRes = await fetch(bdcUrl, { signal: AbortSignal.timeout(4000) }).catch(() => null);

    if (bdcRes && bdcRes.ok) {
      const bdcData = (await bdcRes.json()) as any;
      const locality = bdcData.locality || bdcData.principalSubdivision || 'Local Area';
      const city = bdcData.city || bdcData.locality || 'Metro Area';
      const formatted = `${bdcData.locality || ''}${bdcData.locality && bdcData.city ? ', ' : ''}${bdcData.city || ''}, ${bdcData.principalSubdivision || ''}`.trim() || `GPS Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      return res.json({
        success: true,
        address: formatted,
        locality,
        city,
        displayName: formatted,
        latitude,
        longitude,
        source: 'bigdatacloud',
      });
    }
  } catch (err: any) {
    console.warn('Reverse geocoding server proxy warning:', err);
  }

  // 3. Fallback coordinates
  res.json({
    success: true,
    address: `GPS Pin: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    locality: `District Coordinates (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
    city: 'Current Location',
    displayName: `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
    latitude,
    longitude,
    source: 'coordinates',
  });
});

// ==========================================
// 12. CARTO BASEMAP TILE PROXY (Authenticated with CARTO API Key)
// ==========================================
apiRouter.get('/tiles/carto/:style/:z/:x/:y', async (req: Request, res: Response) => {
  const { style, z, x, y } = req.params;
  const cleanY = y.replace(/\.png$/, '');
  const apiKey = process.env.CARTO_API_KEY || 'cb1_4far_1_2c1d034fd93bd4f62dd57110';

  const validStyles: Record<string, string> = {
    voyager: 'voyager',
    positron: 'light_all',
    light: 'light_all',
    light_all: 'light_all',
    dark: 'dark_all',
    dark_all: 'dark_all',
  };

  const cartoStyle = validStyles[style.toLowerCase()] || 'voyager';
  const subdomains = ['a', 'b', 'c', 'd'];
  const sub = subdomains[Math.abs((parseInt(x) + parseInt(cleanY)) % subdomains.length)] || 'a';
  const cartoTileUrl = `https://${sub}.basemaps.cartocdn.com/rastertiles/${cartoStyle}/${z}/${x}/${cleanY}.png?key=${apiKey}`;

  try {
    const tileRes = await fetch(cartoTileUrl);
    if (!tileRes.ok) {
      return res.status(tileRes.status).send('Tile fetch error');
    }
    const buffer = await tileRes.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('X-CARTO-Provider', 'CARTO Basemaps API Authenticated');
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error('CARTO tile proxy error:', err.message);
    return res.status(502).send('Error proxying CARTO tile');
  }
});

// ==========================================
// 13. ON-DEMAND WASTE MANAGEMENT & PICKUP BOOKING
// ==========================================
apiRouter.get('/waste-pickups/stats', (_req: Request, res: Response) => {
  const stats = wastePickupService.getStats();
  res.json({ success: true, stats });
});

apiRouter.get('/waste-pickups', (req: Request, res: Response) => {
  const user = req.user || resolveUserFromRequest(req);
  const { status, search } = req.query;

  const isOfficialOrAdmin = user && (user.role === 'official' || user.role === 'admin');
  const userId = isOfficialOrAdmin ? undefined : user?.id;

  const pickups = wastePickupService.listPickups({
    userId,
    status: status as string,
    search: search as string,
  });

  res.json({ success: true, pickups, count: pickups.length });
});

apiRouter.get('/waste-pickups/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const pickup = wastePickupService.getPickupById(id);
  if (!pickup) {
    return res.status(404).json({ error: 'Waste pickup booking not found' });
  }
  res.json({ success: true, pickup });
});

apiRouter.post('/waste-pickups', (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const {
      wasteType,
      estimatedWeight,
      pickupDate,
      timeSlot,
      address,
      locality,
      pincode,
      specialInstructions,
      imageUrl,
      contactPhone,
    } = req.body;

    if (!wasteType || !pickupDate || !timeSlot || !address || !locality) {
      return res.status(400).json({
        error: 'Missing required fields: wasteType, pickupDate, timeSlot, address, and locality are required.',
      });
    }

    const booking = wastePickupService.createPickup({
      userId: user.id,
      userName: user.name,
      userPhone: contactPhone || '9876543210',
      userEmail: user.email,
      wasteType,
      estimatedWeight,
      pickupDate,
      timeSlot,
      address,
      locality,
      pincode,
      specialInstructions,
      imageUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Waste collection scheduled successfully.',
      pickup: booking,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to book waste collection.' });
  }
});

apiRouter.patch('/waste-pickups/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedCrew, assignedVehicle, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = wastePickupService.updateStatus(id, {
      status,
      assignedCrew,
      assignedVehicle,
      notes,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Waste pickup not found' });
    }

    res.json({ success: true, pickup: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update pickup status' });
  }
});

apiRouter.post('/waste-pickups/:id/cancel', (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = req.params;
    const result = wastePickupService.cancelPickup(id, user.role === 'admin' ? undefined : user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to cancel waste pickup' });
  }
});
