import Database from 'better-sqlite3';
import { db as databaseConnection } from './db/connection.ts';
import { runMigrations } from './db/migrator.ts';
import { seedDatabase } from './db/seed.ts';
import { calculatePriorityScore, PriorityLevel, ComplaintCategory } from './services/priorityService.ts';
import { lifecycleService } from './services/lifecycleService.ts';
import { analyticsService } from './services/analyticsService.ts';
import { authService, AuthService, UserResponse, FrontendRole } from './services/authService.ts';

// Auto-run migrations on load
runMigrations(databaseConnection);

// Check if seeded; if not, seed
const userCount = databaseConnection.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  seedDatabase(databaseConnection);
}

export type { PriorityLevel, ComplaintCategory };

export interface User {
  id: string;
  name: string;
  email: string;
  role: FrontendRole;
  systemRole?: string;
  department?: string;
  locality?: string;
  avatarUrl?: string;
  createdAt: string;
  permissions?: string[];
}

export interface ComplaintHistoryEntry {
  id: string;
  complaintId: string;
  previousStatus: string;
  newStatus: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  publicUpdate: string;
  explanation?: string;
  deadlineInfo?: string;
  timestamp: string;
}

export interface OfficialNote {
  id: string;
  complaintId: string;
  authorId: string;
  authorName: string;
  department: string;
  note: string;
  visibility: 'internal' | 'public';
  timestamp: string;
}

export interface Complaint {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  address: string;
  locality: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl?: string;
  afterImageUrl?: string;
  status: string;
  priority: PriorityLevel;
  systemRecommendedPriority: PriorityLevel;
  priorityRationale: string[];
  priorityScore?: number;
  safetyRisk: boolean;
  assignedDepartment: string;
  assignedOfficerId?: string | null;
  reporterId: string;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolutionSummary?: string | null;
  votesCount: number;
  slaHours: number;
  hasUserVoted?: boolean;
  ackDeadline?: string | null;
  acknowledgedAt?: string | null;
  nextActionDeadline?: string | null;
  inactivityCycle?: number;
  isBlocked?: boolean;
  blockerReason?: string | null;
  maintenanceIssueId?: string | null;
}

export const DEPARTMENTS = [
  'Public Works & Roads',
  'Sanitation & Waste Management',
  'Drainage & Flood Control',
  'Electrical & Street Lighting',
  'Water Supply & Sanitation Board',
  'Public Safety & Urban Infrastructure',
];

export const CATEGORY_LABELS: Record<string, string> = {
  road_damage: 'Road & Pavement Damage',
  waste_management: 'Waste Management & Sanitation',
  drainage: 'Drainage & Stormwater',
  streetlights: 'Streetlights & Electrical',
  water_supply: 'Water Supply & Pipelines',
  public_safety: 'Public Safety Infrastructure',
};

function formatComplaintRow(row: any): Complaint {
  let parsedRationale: string[] = [];
  try {
    parsedRationale = JSON.parse(row.priority_rationale || '[]');
  } catch {
    parsedRationale = [];
  }

  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    description: row.description,
    category: row.category as ComplaintCategory,
    address: row.address,
    locality: row.locality,
    latitude: row.latitude,
    longitude: row.longitude,
    imageUrl: row.image_url || undefined,
    afterImageUrl: row.after_image_url || undefined,
    status: row.status,
    priority: row.priority as PriorityLevel,
    systemRecommendedPriority: row.system_recommended_priority as PriorityLevel,
    priorityRationale: parsedRationale,
    priorityScore: row.priority_score,
    safetyRisk: Boolean(row.safety_risk),
    assignedDepartment: row.assigned_department,
    assignedOfficerId: row.assigned_officer_id || null,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at || null,
    resolutionSummary: row.resolution_summary || null,
    votesCount: row.votes_count || 1,
    slaHours: row.sla_hours || 72,
    ackDeadline: row.ack_deadline || null,
    acknowledgedAt: row.acknowledged_at || null,
    nextActionDeadline: row.next_action_deadline || null,
    inactivityCycle: row.inactivity_cycle || 0,
    isBlocked: Boolean(row.is_blocked),
    blockerReason: row.blocker_reason || null,
    maintenanceIssueId: row.maintenance_issue_id || null,
  };
}

export class DatabaseRepository {
  constructor(private db: Database.Database = databaseConnection) {}

  public getUsers(): User[] {
    return new AuthService(this.db).listUsers();
  }

  public getUserById(id: string): User | undefined {
    const user = new AuthService(this.db).getUserById(id);
    return user || undefined;
  }

  public getComplaints(filter?: {
    category?: string;
    status?: string;
    priority?: string;
    department?: string;
    locality?: string;
    search?: string;
    reporterId?: string;
  }): Complaint[] {
    let sql = 'SELECT * FROM complaints WHERE 1=1';
    const params: any[] = [];

    if (filter) {
      if (filter.category && filter.category !== 'all') {
        sql += ' AND category = ?';
        params.push(filter.category);
      }
      if (filter.status && filter.status !== 'all') {
        sql += ' AND status = ?';
        params.push(filter.status);
      }
      if (filter.priority && filter.priority !== 'all') {
        sql += ' AND priority = ?';
        params.push(filter.priority);
      }
      if (filter.department && filter.department !== 'all') {
        sql += ' AND assigned_department = ?';
        params.push(filter.department);
      }
      if (filter.locality && filter.locality !== 'all') {
        sql += ' AND LOWER(locality) LIKE LOWER(?)';
        params.push(`%${filter.locality}%`);
      }
      if (filter.reporterId) {
        sql += ' AND reporter_id = ?';
        params.push(filter.reporterId);
      }
      if (filter.search && filter.search.trim()) {
        const q = `%${filter.search.trim().toLowerCase()}%`;
        sql += ` AND (
          LOWER(reference) LIKE ? OR
          LOWER(title) LIKE ? OR
          LOWER(description) LIKE ? OR
          LOWER(address) LIKE ? OR
          LOWER(locality) LIKE ?
        )`;
        params.push(q, q, q, q, q);
      }
    }

    sql += ' ORDER BY datetime(created_at) DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(formatComplaintRow);
  }

  public getComplaintById(idOrRef: string): Complaint | undefined {
    const row = this.db
      .prepare('SELECT * FROM complaints WHERE id = ? OR UPPER(reference) = UPPER(?)')
      .get(idOrRef, idOrRef) as any;
    return row ? formatComplaintRow(row) : undefined;
  }

  public createComplaint(params: {
    title: string;
    description: string;
    category: ComplaintCategory;
    address: string;
    locality?: string;
    latitude?: number | null;
    longitude?: number | null;
    imageUrl?: string;
    safetyRisk: boolean;
    reporterId: string;
    reporterName: string;
  }): Complaint {
    const countRow = this.db.prepare('SELECT count(*) as c FROM complaints').get() as { c: number };
    const count = countRow.c + 1;
    const refNumber = String(count).padStart(3, '0');
    const reference = `CP-2026-${refNumber}`;
    const id = `cmp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Default department routing based on category
    let assignedDepartment = 'Public Works & Roads';
    switch (params.category) {
      case 'waste_management':
        assignedDepartment = 'Sanitation & Waste Management';
        break;
      case 'drainage':
        assignedDepartment = 'Drainage & Flood Control';
        break;
      case 'streetlights':
        assignedDepartment = 'Electrical & Street Lighting';
        break;
      case 'water_supply':
        assignedDepartment = 'Water Supply & Sanitation Board';
        break;
      case 'public_safety':
        assignedDepartment = 'Public Safety & Urban Infrastructure';
        break;
      default:
        assignedDepartment = 'Public Works & Roads';
    }

    // Transparent prioritization calculation
    const recommendation = calculatePriorityScore({
      category: params.category,
      safetyRisk: params.safetyRisk,
      votesCount: 1,
      createdAt: now,
      status: 'Submitted',
      address: params.address,
      locality: params.locality,
    });

    // Deadlines: 24h acknowledgement deadline
    const ackDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const nextActionDeadline = ackDeadline;

    const historyId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const voteId = `vote-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO complaints (
            id, reference, title, description, category, address, locality, latitude, longitude,
            image_url, status, priority, system_recommended_priority, priority_rationale,
            priority_score, safety_risk, assigned_department, reporter_id, reporter_name,
            created_at, updated_at, votes_count, sla_hours, ack_deadline, next_action_deadline
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, 'Submitted', ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, 1, ?, ?, ?
          )`
        )
        .run(
          id,
          reference,
          params.title.trim(),
          params.description.trim(),
          params.category,
          params.address.trim(),
          params.locality?.trim() || 'Central Metro',
          params.latitude ?? null,
          params.longitude ?? null,
          params.imageUrl || null,
          recommendation.recommendedPriority,
          recommendation.recommendedPriority,
          JSON.stringify(recommendation.rationale),
          recommendation.score,
          params.safetyRisk ? 1 : 0,
          assignedDepartment,
          params.reporterId,
          params.reporterName,
          now,
          now,
          recommendation.slaHours,
          ackDeadline,
          nextActionDeadline
        );

      this.db
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, deadline_info, timestamp
          ) VALUES (?, ?, 'None', 'Submitted', 'SUBMITTED', ?, ?, 'Citizen', 'Complaint registered into CivicPulse municipal queue.', ?, ?)`
        )
        .run(
          historyId,
          id,
          params.reporterId,
          params.reporterName,
          `Acknowledgement Deadline: ${ackDeadline}`,
          now
        );

      this.db
        .prepare(
          `INSERT INTO votes (id, complaint_id, user_id, timestamp) VALUES (?, ?, ?, ?)`
        )
        .run(voteId, id, params.reporterId, now);
    });

    tx();

    return this.getComplaintById(id)!;
  }

  public updateStatus(params: {
    complaintId: string;
    newStatus: string;
    actor: User;
    publicUpdate?: string;
    resolutionSummary?: string;
    afterImageUrl?: string;
  }): { complaint: Complaint; historyEntry: ComplaintHistoryEntry } | null {
    try {
      const res = lifecycleService.transitionStatus({
        complaintId: params.complaintId,
        targetStatus: params.newStatus,
        actor: {
          id: params.actor.id,
          name: params.actor.name,
          role: params.actor.role === 'official' ? 'Municipal Official' : 'System Admin',
        },
        publicUpdate: params.publicUpdate,
        resolutionSummary: params.resolutionSummary,
        afterImageUrl: params.afterImageUrl,
      });

      return {
        complaint: formatComplaintRow(res.complaint),
        historyEntry: {
          id: res.historyEntry.id,
          complaintId: res.historyEntry.complaint_id,
          previousStatus: res.historyEntry.previous_status,
          newStatus: res.historyEntry.new_status,
          actorId: res.historyEntry.actor_id,
          actorName: res.historyEntry.actor_name,
          actorRole: res.historyEntry.actor_role,
          publicUpdate: res.historyEntry.public_update,
          timestamp: res.historyEntry.timestamp,
        },
      };
    } catch {
      return null;
    }
  }

  public updatePriority(params: {
    complaintId: string;
    priority: PriorityLevel;
    overrideReason: string;
    actor: User;
  }): Complaint | null {
    const complaint = this.getComplaintById(params.complaintId);
    if (!complaint) return null;

    let sla = 72;
    if (params.priority === 'Critical') sla = 24;
    else if (params.priority === 'High') sla = 48;
    else if (params.priority === 'Medium') sla = 72;
    else sla = 120;

    const now = new Date().toISOString();
    const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const noteId = `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE complaints SET priority = ?, sla_hours = ?, updated_at = ? WHERE id = ?`
        )
        .run(params.priority, sla, now, complaint.id);

      this.db
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, timestamp
          ) VALUES (?, ?, ?, ?, 'PRIORITY_OVERRIDE', ?, ?, 'Municipal Official', ?, ?, ?)`
        )
        .run(
          histId,
          complaint.id,
          complaint.status,
          complaint.status,
          params.actor.id,
          params.actor.name,
          `Priority revised from ${complaint.priority} to ${params.priority}. Justification: ${params.overrideReason}`,
          params.overrideReason,
          now
        );

      this.db
        .prepare(
          `INSERT INTO official_notes (
            id, complaint_id, author_id, author_name, department, note, visibility, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, 'public', ?)`
        )
        .run(
          noteId,
          complaint.id,
          params.actor.id,
          params.actor.name,
          params.actor.department || complaint.assignedDepartment,
          `Official Priority Override: Adjusted priority to ${params.priority}. Reason: ${params.overrideReason}`,
          now
        );
    });

    tx();

    return this.getComplaintById(complaint.id)!;
  }

  public updateAssignment(params: {
    complaintId: string;
    department: string;
    actor: User;
    note?: string;
  }): Complaint | null {
    const complaint = this.getComplaintById(params.complaintId);
    if (!complaint) return null;

    const prevDept = complaint.assignedDepartment;
    const now = new Date().toISOString();
    const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const tx = this.db.transaction(() => {
      this.db
        .prepare('UPDATE complaints SET assigned_department = ?, updated_at = ? WHERE id = ?')
        .run(params.department, now, complaint.id);

      this.db
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, timestamp
          ) VALUES (?, ?, ?, ?, 'DEPARTMENT_ROUTED', ?, ?, 'Municipal Official', ?, ?, ?)`
        )
        .run(
          histId,
          complaint.id,
          complaint.status,
          complaint.status,
          params.actor.id,
          params.actor.name,
          `Department routing transferred from "${prevDept}" to "${params.department}".`,
          params.note || null,
          now
        );
    });

    tx();

    return this.getComplaintById(complaint.id)!;
  }

  public voteComplaint(params: { complaintId: string; userId: string }): {
    success: boolean;
    votesCount: number;
    message: string;
  } {
    const complaint = this.getComplaintById(params.complaintId);
    if (!complaint) return { success: false, votesCount: 0, message: 'Complaint not found' };

    const existing = this.db
      .prepare('SELECT id FROM votes WHERE complaint_id = ? AND user_id = ?')
      .get(complaint.id, params.userId);

    if (existing) {
      return {
        success: false,
        votesCount: complaint.votesCount,
        message: 'You have already endorsed this civic complaint.',
      };
    }

    const voteId = `vote-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newCount = complaint.votesCount + 1;

    // Recalculate smart priority score with new vote
    const rec = calculatePriorityScore({
      category: complaint.category,
      safetyRisk: complaint.safetyRisk,
      votesCount: newCount,
      createdAt: complaint.createdAt,
      status: complaint.status,
      address: complaint.address,
      locality: complaint.locality,
    });

    const tx = this.db.transaction(() => {
      this.db
        .prepare('INSERT INTO votes (id, complaint_id, user_id, timestamp) VALUES (?, ?, ?, ?)'
        )
        .run(voteId, complaint.id, params.userId, now);

      this.db
        .prepare(
          `UPDATE complaints SET
            votes_count = ?,
            system_recommended_priority = ?,
            priority_rationale = ?,
            priority_score = ?,
            updated_at = ?
           WHERE id = ?`
        )
        .run(
          newCount,
          rec.recommendedPriority,
          JSON.stringify(rec.rationale),
          rec.score,
          now,
          complaint.id
        );
    });

    tx();

    return {
      success: true,
      votesCount: newCount,
      message: 'Your endorsement was recorded successfully.',
    };
  }

  public hasUserVoted(complaintId: string, userId: string): boolean {
    const row = this.db
      .prepare('SELECT id FROM votes WHERE complaint_id = ? AND user_id = ?')
      .get(complaintId, userId);
    return Boolean(row);
  }

  public getComplaintHistory(complaintId: string): ComplaintHistoryEntry[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM complaint_history
         WHERE complaint_id = ?
         ORDER BY datetime(timestamp) ASC`
      )
      .all(complaintId) as any[];

    return rows.map((r) => ({
      id: r.id,
      complaintId: r.complaint_id,
      previousStatus: r.previous_status,
      newStatus: r.new_status,
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      publicUpdate: r.public_update,
      explanation: r.explanation || undefined,
      deadlineInfo: r.deadline_info || undefined,
      timestamp: r.timestamp,
    }));
  }

  public getComplaintNotes(complaintId: string, isOfficial: boolean): OfficialNote[] {
    let sql = 'SELECT * FROM official_notes WHERE complaint_id = ?';
    if (!isOfficial) {
      sql += " AND visibility = 'public'";
    }
    sql += ' ORDER BY datetime(timestamp) ASC';

    const rows = this.db.prepare(sql).all(complaintId) as any[];
    return rows.map((r) => ({
      id: r.id,
      complaintId: r.complaint_id,
      authorId: r.author_id,
      authorName: r.author_name,
      department: r.department,
      note: r.note,
      visibility: r.visibility,
      timestamp: r.timestamp,
    }));
  }

  public addOfficialNote(params: {
    complaintId: string;
    author: User;
    note: string;
    visibility: 'internal' | 'public';
  }): OfficialNote {
    const id = `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO official_notes (id, complaint_id, author_id, author_name, department, note, visibility, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        params.complaintId,
        params.author.id,
        params.author.name,
        params.author.department || 'Municipal Administration',
        params.note.trim(),
        params.visibility,
        now
      );

    return {
      id,
      complaintId: params.complaintId,
      authorId: params.author.id,
      authorName: params.author.name,
      department: params.author.department || 'Municipal Administration',
      note: params.note.trim(),
      visibility: params.visibility,
      timestamp: now,
    };
  }

  public getAnalytics() {
    return analyticsService.getMunicipalAnalytics();
  }

  public resetToSeed() {
    seedDatabase(this.db);
    return { complaints: this.getComplaints() };
  }
}

export const db = new DatabaseRepository();
