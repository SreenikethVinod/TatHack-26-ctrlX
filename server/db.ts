import Database from 'better-sqlite3';
import { db as databaseConnection } from './db/connection.ts';
import { runMigrations } from './db/migrator.ts';
import { seedDatabase } from './db/seed.ts';
import { calculatePriorityScore, PriorityLevel, ComplaintCategory } from './services/priorityService.ts';
import { lifecycleService } from './services/lifecycleService.ts';
import { analyticsService } from './services/analyticsService.ts';
import { authService, AuthService, UserResponse, FrontendRole } from './services/authService.ts';
import { haversineDistanceMeters, tokenSimilarity } from './services/duplicateService.ts';
import { NotificationService, notificationService } from './services/notificationService.ts';

// Auto-run migrations on load
runMigrations(databaseConnection);

// Check if seeded; if not, seed
const userCount = databaseConnection.prepare('SELECT count(*) as count FROM users').get() as { count: number };
const complaintCount = databaseConnection.prepare('SELECT count(*) as count FROM complaints').get() as { count: number };
if (userCount.count < 8 || complaintCount.count < 16) {
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
  eventType?: string;
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
  acknowledgedBy?: string | null;
  acknowledgedByName?: string | null;
  assignedWorker?: string | null;
  budget?: number;
  budgetNotes?: string | null;
  assignedAt?: string | null;
  assignedBy?: string | null;
  assignedByName?: string | null;
  nextActionDeadline?: string | null;
  inactivityCycle?: number;
  isBlocked?: boolean;
  blockerReason?: string | null;
  maintenanceIssueId?: string | null;
  isEscalatedDistrict?: boolean;
  districtActionNotes?: string | null;
  districtActionAt?: string | null;
  districtActionBy?: string | null;
  daysUnacknowledged?: number;
  followersCount?: number;
  isFollowing?: boolean;
  mergedCount?: number;
  isMerged?: boolean;
  mergedWithReference?: string | null;
  photoFingerprint?: string | null;
  photoMetadata?: any | null;
  isFlaggedLocationMismatch?: boolean;
  locationMatchStatus?: 'VERIFIED' | 'FLAGGED_MISMATCH' | 'NO_PHOTO';
  photoDistanceMeters?: number | null;
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

function formatComplaintRow(row: any, activeDb: Database.Database = databaseConnection): Complaint {
  let parsedRationale: string[] = [];
  try {
    parsedRationale = JSON.parse(row.priority_rationale || '[]');
  } catch {
    parsedRationale = [];
  }

  const createdMs = new Date(row.created_at).getTime();
  const ackMs = row.acknowledged_at ? new Date(row.acknowledged_at).getTime() : Date.now();
  const daysDiff = Math.max(0, Math.floor((Date.now() - createdMs) / (1000 * 60 * 60 * 24)));

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
    acknowledgedBy: row.acknowledged_by || null,
    acknowledgedByName: row.acknowledged_by_name || null,
    assignedWorker: row.assigned_worker || null,
    budget: row.budget !== undefined && row.budget !== null ? Number(row.budget) : 0,
    budgetNotes: row.budget_notes || null,
    assignedAt: row.assigned_at || null,
    assignedBy: row.assigned_by || null,
    assignedByName: row.assigned_by_name || null,
    nextActionDeadline: row.next_action_deadline || null,
    inactivityCycle: row.inactivity_cycle || 0,
    isBlocked: Boolean(row.is_blocked),
    blockerReason: row.blocker_reason || null,
    maintenanceIssueId: row.maintenance_issue_id || null,
    isEscalatedDistrict: Boolean(row.is_escalated_district) || row.status === 'Escalated to District Admin',
    districtActionNotes: row.district_action_notes || null,
    districtActionAt: row.district_action_at || null,
    districtActionBy: row.district_action_by || null,
    daysUnacknowledged: row.acknowledged_at ? 0 : daysDiff,
    followersCount: (() => {
      try {
        const f = activeDb.prepare('SELECT count(*) as c FROM complaint_followers WHERE complaint_id = ?').get(row.id) as any;
        return Math.max(1, f?.c || 1);
      } catch {
        return 1;
      }
    })(),
    isMerged: (() => {
      try {
        const asDup = activeDb.prepare('SELECT id FROM complaint_duplicate_links WHERE complaint_id = ?').get(row.id) as any;
        if (asDup) return true;
        const asCanonical = activeDb.prepare('SELECT count(*) as c FROM complaint_duplicate_links WHERE canonical_complaint_id = ?').get(row.id) as any;
        return (asCanonical?.c || 0) > 0;
      } catch {
        return false;
      }
    })(),
    mergedWithReference: (() => {
      try {
        const asDup = activeDb.prepare(`
          SELECT c.reference FROM complaint_duplicate_links l
          JOIN complaints c ON c.id = l.canonical_complaint_id
          WHERE l.complaint_id = ?
        `).get(row.id) as any;
        return asDup?.reference || null;
      } catch {
        return null;
      }
    })(),
    mergedCount: (() => {
      try {
        const d = activeDb.prepare('SELECT count(*) as c FROM complaint_duplicate_links WHERE canonical_complaint_id = ?').get(row.id) as any;
        return d?.c || 0;
      } catch {
        return 0;
      }
    })(),
    photoFingerprint: row.photo_fingerprint || null,
    photoMetadata: (() => {
      if (!row.photo_metadata) return null;
      try {
        return typeof row.photo_metadata === 'string' ? JSON.parse(row.photo_metadata) : row.photo_metadata;
      } catch {
        return null;
      }
    })(),
    isFlaggedLocationMismatch: Boolean(row.is_flagged_location_mismatch),
    locationMatchStatus: row.location_match_status || (row.image_url ? 'VERIFIED' : 'NO_PHOTO'),
    photoDistanceMeters:
      row.photo_distance_meters !== null && row.photo_distance_meters !== undefined
        ? Number(row.photo_distance_meters)
        : null,
  };
}

export class DatabaseRepository {
  private notifService: NotificationService;

  constructor(private db: Database.Database = databaseConnection) {
    this.notifService = new NotificationService(this.db);
  }

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
    // Check and escalate any complaints unacknowledged for > 14 days automatically
    this.checkAndEscalateFourteenDayReports();

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
    return rows.map((r) => formatComplaintRow(r, this.db));
  }

  public getComplaintById(idOrRef: string): Complaint | undefined {
    const row = this.db
      .prepare('SELECT * FROM complaints WHERE id = ? OR UPPER(reference) = UPPER(?)')
      .get(idOrRef, idOrRef) as any;
    return row ? formatComplaintRow(row, this.db) : undefined;
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
    photoFingerprint?: string | null;
    photoMetadata?: any | null;
    photoDistanceMeters?: number | null;
    isFlaggedLocationMismatch?: boolean;
    locationMatchStatus?: string;
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
      case 'other':
        assignedDepartment = 'General Municipal Administration & Public Services';
        break;
      default:
        assignedDepartment = 'Public Works & Roads';
    }

    // Photo verification and location discrepancy detection
    let verifiedLocationMatchStatus = 'NO_PHOTO';
    let isFlaggedMismatch = 0;
    let computedPhotoDistance: number | null = null;

    if (params.imageUrl) {
      verifiedLocationMatchStatus = 'VERIFIED';
      const meta = params.photoMetadata
        ? typeof params.photoMetadata === 'string'
          ? JSON.parse(params.photoMetadata)
          : params.photoMetadata
        : null;

      const photoLat = meta?.deviceGps?.latitude;
      const photoLng = meta?.deviceGps?.longitude;

      if (
        photoLat !== undefined &&
        photoLng !== undefined &&
        params.latitude !== null &&
        params.latitude !== undefined &&
        params.longitude !== null &&
        params.longitude !== undefined &&
        !isNaN(Number(photoLat)) &&
        !isNaN(Number(photoLng)) &&
        !isNaN(Number(params.latitude)) &&
        !isNaN(Number(params.longitude))
      ) {
        computedPhotoDistance = Math.round(
          haversineDistanceMeters(
            Number(params.latitude),
            Number(params.longitude),
            Number(photoLat),
            Number(photoLng)
          )
        );

        // Flag discrepancy if distance between live photo GPS and reported coordinates > 300 meters
        if (computedPhotoDistance > 300) {
          isFlaggedMismatch = 1;
          verifiedLocationMatchStatus = 'FLAGGED_MISMATCH';
        } else {
          isFlaggedMismatch = 0;
          verifiedLocationMatchStatus = 'VERIFIED';
        }
      } else if (params.isFlaggedLocationMismatch) {
        isFlaggedMismatch = 1;
        verifiedLocationMatchStatus = 'FLAGGED_MISMATCH';
      }

      if (params.photoDistanceMeters !== undefined && params.photoDistanceMeters !== null) {
        computedPhotoDistance = params.photoDistanceMeters;
      }
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

    // Deadlines: 14-day statutory acknowledgement deadline before District Admin escalation
    const ackDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const nextActionDeadline = ackDeadline;

    const historyId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const voteId = `vote-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const stringifiedPhotoMetadata = params.photoMetadata
      ? typeof params.photoMetadata === 'string'
        ? params.photoMetadata
        : JSON.stringify(params.photoMetadata)
      : null;

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO complaints (
            id, reference, title, description, category, address, locality, latitude, longitude,
            image_url, status, priority, system_recommended_priority, priority_rationale,
            priority_score, safety_risk, assigned_department, reporter_id, reporter_name,
            created_at, updated_at, votes_count, sla_hours, ack_deadline, next_action_deadline,
            photo_fingerprint, photo_metadata, is_flagged_location_mismatch, location_match_status, photo_distance_meters
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, 'Submitted', ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, 1, ?, ?, ?,
            ?, ?, ?, ?, ?
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
          nextActionDeadline,
          params.photoFingerprint || null,
          stringifiedPhotoMetadata,
          isFlaggedMismatch,
          verifiedLocationMatchStatus,
          computedPhotoDistance
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

      if (isFlaggedMismatch === 1) {
        const flagHistId = `hist-flag-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        this.db
          .prepare(
            `INSERT INTO complaint_history (
              id, complaint_id, previous_status, new_status, event_type,
              actor_id, actor_name, actor_role, public_update, explanation, deadline_info, timestamp
            ) VALUES (?, ?, 'Submitted', 'Submitted', 'FLAGGED_MISMATCH', ?, ?, 'System Sentinel', ?, ?, ?, ?)`
          )
          .run(
            flagHistId,
            id,
            params.reporterId,
            params.reporterName,
            `⚠️ Location Discrepancy Flagged: In-app camera photo was captured ${computedPhotoDistance || 0}m away from the reported incident location.`,
            'Automated cryptographic photo metadata validation failed proximity tolerance threshold (>300m).',
            'Requires Field Verification by Junior Engineer',
            now
          );
      }

      this.db
        .prepare(
          `INSERT INTO votes (id, complaint_id, user_id, timestamp) VALUES (?, ?, ?, ?)`
        )
        .run(voteId, id, params.reporterId, now);

      // Auto-follow own report
      try {
        const folId = `fol-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        this.db
          .prepare(
            `INSERT OR IGNORE INTO complaint_followers (id, complaint_id, user_id, user_name, created_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(folId, id, params.reporterId, params.reporterName, now);
      } catch {}
    });

    tx();

    // =========================================================================
    // SPATIAL DEDUPLICATION & AUTO-MERGE ENGINE:
    // If two citizens post about the same problem in the same area (e.g. within 50m-65m
    // apart, such as from opposite sides of the road), automatically cluster and merge them!
    // =========================================================================
    if (
      params.latitude !== null &&
      params.longitude !== null &&
      typeof params.latitude === 'number' &&
      typeof params.longitude === 'number' &&
      !isNaN(params.latitude) &&
      !isNaN(params.longitude)
    ) {
      try {
        const existingCandidates = this.db
          .prepare(
            `SELECT * FROM complaints
             WHERE id != ?
               AND latitude IS NOT NULL
               AND longitude IS NOT NULL
               AND status NOT IN ('Rejected')
             ORDER BY datetime(created_at) ASC`
          )
          .all(id) as any[];

        for (const cand of existingCandidates) {
          const dist = haversineDistanceMeters(
            params.latitude,
            params.longitude,
            Number(cand.latitude),
            Number(cand.longitude)
          );

          // Spatial proximity threshold: 85m covers opposite sides of road, intersections and sidewalks
          if (dist <= 85) {
            const sameCategory = cand.category === params.category;
            const textSim = tokenSimilarity(
              `${params.title} ${params.description}`,
              `${cand.title} ${cand.description}`
            );

            // Match if same problem category OR significant token overlap
            if (sameCategory || textSim >= 0.15) {
              const canonical = cand;
              const canonicalId = canonical.id;
              const distMeters = Math.max(1, Math.round(dist));

              // 1. Ensure or create shared maintenance issue group
              let issueId = canonical.maintenance_issue_id;
              if (!issueId) {
                issueId = `mi-cluster-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
                this.db
                  .prepare(
                    `INSERT INTO maintenance_issues (id, title, category, locality, status, primary_complaint_id, created_at, updated_at)
                     VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?)`
                  )
                  .run(issueId, canonical.title, canonical.category, canonical.locality, canonicalId, now, now);

                this.db.prepare('UPDATE complaints SET maintenance_issue_id = ? WHERE id = ?').run(issueId, canonicalId);
              }

              // Update new complaint's maintenance issue pointer
              this.db.prepare('UPDATE complaints SET maintenance_issue_id = ? WHERE id = ?').run(issueId, id);

              // 2. Insert duplicate link marking this as an automatic confirmed spatial merge
              const linkId = `dup-auto-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
              this.db
                .prepare(
                  `INSERT INTO complaint_duplicate_links (
                    id, complaint_id, canonical_complaint_id, confidence_score,
                    similarity_reason, confirmed_by, status, maintenance_issue_id, created_at
                  ) VALUES (?, ?, ?, 0.96, ?, NULL, 'confirmed', ?, ?)
                  ON CONFLICT(complaint_id, canonical_complaint_id) DO UPDATE SET status = 'confirmed'`
                )
                .run(
                  linkId,
                  id,
                  canonicalId,
                  `Opposite side of street spatial cluster: Within ${distMeters}m across the road (${CATEGORY_LABELS[params.category] || params.category}). Automatically merged into unified municipal issue.`,
                  issueId,
                  now
                );

              // 3. Boost canonical complaint community corroboration & recalculate smart priority
              const canVoteId = `vote-auto-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
              try {
                this.db
                  .prepare('INSERT OR IGNORE INTO votes (id, complaint_id, user_id, timestamp) VALUES (?, ?, ?, ?)')
                  .run(canVoteId, canonicalId, params.reporterId, now);
              } catch {}

              const newVoteCount = (canonical.votes_count || 1) + 1;
              const rec = calculatePriorityScore({
                category: canonical.category,
                safetyRisk: Boolean(canonical.safety_risk),
                votesCount: newVoteCount,
                createdAt: canonical.created_at,
                status: canonical.status,
                address: canonical.address,
                locality: canonical.locality,
              });

              let rationale: string[] = [];
              try {
                rationale = JSON.parse(canonical.priority_rationale || '[]');
              } catch {
                rationale = [];
              }
              const corroborationNote = `Multi-citizen corroboration across street (${distMeters}m away)`;
              if (!rationale.includes(corroborationNote)) {
                rationale.push(corroborationNote);
              }

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
                .run(newVoteCount, rec.recommendedPriority, JSON.stringify(rationale), rec.score, now, canonicalId);

              // 4. Auto-subscribe both citizens as followers of the canonical report
              this.notifService.ensureFollow(canonicalId, {
                id: params.reporterId,
                name: params.reporterName,
              });
              if (canonical.reporter_id) {
                this.notifService.ensureFollow(canonicalId, {
                  id: canonical.reporter_id,
                  name: canonical.reporter_name,
                });
              }

              // 5. Append audit history to canonical and new complaints
              this.db
                .prepare(
                  `INSERT INTO complaint_history (
                    id, complaint_id, previous_status, new_status, event_type,
                    actor_id, actor_name, actor_role, public_update, explanation, timestamp
                  ) VALUES (?, ?, ?, ?, 'AUTO_SPATIAL_CLUSTER_MERGE', 'system', 'Geo-Spatial Deduplication Engine', 'System', ?, ?, ?)`
                )
                .run(
                  `hist-merge-${id}`,
                  canonicalId,
                  canonical.status,
                  canonical.status,
                  `SPATIAL AUTO-MERGE: Second resident report (${reference}) located ~${distMeters}m away across the road was automatically merged into this issue. Community corroboration score boosted to ${rec.score}.`,
                  `Multi-citizen corroboration across road clustered under canonical ticket.`,
                  now
                );

              this.db
                .prepare(
                  `INSERT INTO complaint_history (
                    id, complaint_id, previous_status, new_status, event_type,
                    actor_id, actor_name, actor_role, public_update, explanation, timestamp
                  ) VALUES (?, ?, 'None', 'Submitted', 'AUTO_MERGED_INTO_CANONICAL', 'system', 'Geo-Spatial Deduplication Engine', 'System', ?, ?, ?)`
                )
                .run(
                  `hist-child-${id}`,
                  id,
                  `SPATIAL AUTO-MERGE: Matched with existing report ${canonical.reference} (~${distMeters}m away across the road). Clustered together to prevent duplicate contractor payouts. You are automatically following updates.`,
                  `Auto-merged into canonical issue ${canonical.reference}.`,
                  now
                );

              // 6. Send in-app notifications to both citizens
              this.notifService.notifyFollowers({
                complaintId: id,
                type: 'AUTO_MERGED',
                title: 'Spatial Auto-Merge: Nearby Report Detected',
                message: `Your report was automatically merged with existing report ${canonical.reference} located ~${distMeters}m away across the road. Endorsements pooled to accelerate municipal action!`,
              });

              this.notifService.notifyFollowers({
                complaintId: canonicalId,
                type: 'COMMUNITY_CORROBORATION',
                title: 'Community Corroboration Boosted!',
                message: `Another resident reported this same issue from across the road (~${distMeters}m away). Community endorsement count boosted to #${newVoteCount}!`,
              });

              break; // Auto-merged with primary canonical report
            }
          }
        }
      } catch (err) {
        console.error('[Spatial Deduplication] Auto-merge error:', err);
      }
    }

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

      this.notifService.notifyFollowers({
        complaintId: params.complaintId,
        type: 'STATUS_UPDATE',
        title: `Status: ${params.newStatus}`,
        message: `Report ${res.complaint.reference} status updated to "${params.newStatus}". ${params.publicUpdate || ''}`,
        excludeUserId: params.actor.id,
      });

      return {
        complaint: formatComplaintRow(res.complaint, this.db),
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
    hasUserVoted?: boolean;
    message: string;
  } {
    const complaint = this.getComplaintById(params.complaintId);
    if (!complaint) return { success: false, votesCount: 0, message: 'Complaint not found' };

    const existing = this.db
      .prepare('SELECT id FROM votes WHERE complaint_id = ? AND user_id = ?')
      .get(complaint.id, params.userId);

    const now = new Date().toISOString();

    if (existing) {
      // Toggle off / remove endorsement
      const newCount = Math.max(0, complaint.votesCount - 1);
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
        this.db.prepare('DELETE FROM votes WHERE complaint_id = ? AND user_id = ?').run(complaint.id, params.userId);
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
          .run(newCount, rec.recommendedPriority, JSON.stringify(rec.rationale), rec.score, now, complaint.id);
      });
      tx();

      return {
        success: true,
        votesCount: newCount,
        hasUserVoted: false,
        message: 'Endorsement withdrawn.',
      };
    }

    const voteId = `vote-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
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
        .prepare('INSERT INTO votes (id, complaint_id, user_id, timestamp) VALUES (?, ?, ?, ?)')
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
      hasUserVoted: true,
      message: 'Your endorsement was recorded! Community trustability and priority boosted.',
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
      eventType: r.event_type || 'UPDATE',
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

  public acknowledgeComplaint(params: {
    complaintId: string;
    actor: User;
    notes?: string;
  }): Complaint | null {
    const complaint = this.getComplaintById(params.complaintId);
    if (!complaint) return null;

    const now = new Date().toISOString();
    const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const noteText = params.notes?.trim() || `Report reviewed and formally acknowledged by ${params.actor.name}. Field triage initiated.`;

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE complaints SET
            status = 'Acknowledged',
            acknowledged_at = ?,
            acknowledged_by = ?,
            acknowledged_by_name = ?,
            updated_at = ?
           WHERE id = ?`
        )
        .run(now, params.actor.id, params.actor.name, now, complaint.id);

      this.db
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, timestamp
          ) VALUES (?, ?, ?, 'Acknowledged', 'ACKNOWLEDGED', ?, ?, 'Municipality Admin', ?, ?, ?)`
        )
        .run(
          histId,
          complaint.id,
          complaint.status,
          params.actor.id,
          params.actor.name,
          `Report acknowledged by ${params.actor.name} (${params.actor.department || 'Municipal Administration'}). Task scheduling commenced.`,
          noteText,
          now
        );

      this.db
        .prepare(
          `INSERT INTO official_notes (
            id, complaint_id, author_id, author_name, department, note, visibility, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, 'public', ?)`
        )
        .run(
          `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          complaint.id,
          params.actor.id,
          params.actor.name,
          params.actor.department || 'Municipal Administration',
          `Formal Municipal Acknowledgement: ${noteText}`,
          now
        );
    });

    tx();

    this.notifService.notifyFollowers({
      complaintId: complaint.id,
      type: 'ACKNOWLEDGED',
      title: 'Report Formally Acknowledged',
      message: `Municipal desk acknowledged ${complaint.reference}. Field triage initiated.`,
      excludeUserId: params.actor.id,
    });

    return this.getComplaintById(complaint.id) || null;
  }

  public assignWorkerAndBudget(params: {
    complaintId: string;
    worker: string;
    budget: number;
    budgetNotes?: string;
    actor: User;
  }): Complaint | null {
    const complaint = this.getComplaintById(params.complaintId);
    if (!complaint) return null;

    const now = new Date().toISOString();
    const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const noteId = `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const tx = this.db.transaction(() => {
      // If not already acknowledged, mark as acknowledged at the same time
      const ackAt = complaint.acknowledgedAt || now;
      const ackBy = complaint.acknowledgedBy || params.actor.id;
      const ackByName = complaint.acknowledgedByName || params.actor.name;

      this.db
        .prepare(
          `UPDATE complaints SET
            status = 'In Progress',
            assigned_worker = ?,
            budget = ?,
            budget_notes = ?,
            assigned_at = ?,
            assigned_by = ?,
            assigned_by_name = ?,
            acknowledged_at = ?,
            acknowledged_by = ?,
            acknowledged_by_name = ?,
            updated_at = ?
           WHERE id = ?`
        )
        .run(
          params.worker.trim(),
          params.budget,
          params.budgetNotes?.trim() || null,
          now,
          params.actor.id,
          params.actor.name,
          ackAt,
          ackBy,
          ackByName,
          now,
          complaint.id
        );

      this.db
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, timestamp
          ) VALUES (?, ?, ?, 'In Progress', 'WORKER_ASSIGNED', ?, ?, 'Municipality Admin', ?, ?, ?)`
        )
        .run(
          histId,
          complaint.id,
          complaint.status,
          params.actor.id,
          params.actor.name,
          `Work task assigned to "${params.worker.trim()}" with an approved budget of $${params.budget.toLocaleString()}.`,
          params.budgetNotes || `Budget allocated: $${params.budget.toLocaleString()}`,
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
          `Work Order Dispatched: Assigned to ${params.worker.trim()}. Allocated Repair Budget: $${params.budget.toLocaleString()}.${params.budgetNotes ? ` Instructions: ${params.budgetNotes}` : ''}`,
          now
        );
    });

    tx();

    this.notifService.notifyFollowers({
      complaintId: complaint.id,
      type: 'WORKER_ASSIGNED',
      title: 'Repair Crew Dispatched',
      message: `Work order dispatched: Assigned to ${params.worker.trim()} with approved repair budget of $${params.budget.toLocaleString()}.`,
      excludeUserId: params.actor.id,
    });

    return this.getComplaintById(complaint.id) || null;
  }

  public checkAndEscalateFourteenDayReports(): { escalatedCount: number; escalatedIds: string[] } {
    const now = new Date();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Query unacknowledged reports older than 14 days
    const unackRows = this.db
      .prepare(
        `SELECT * FROM complaints
         WHERE acknowledged_at IS NULL
           AND status NOT IN ('Resolved', 'Rejected')
           AND datetime(created_at) <= datetime(?)`
      )
      .all(fourteenDaysAgo) as any[];

    const escalatedIds: string[] = [];

    for (const c of unackRows) {
      if (c.status !== 'Escalated to District Admin' || !c.is_escalated_district) {
        const nowStr = now.toISOString();
        const escId = `esc-14d-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const daysOverdue = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));

        const tx = this.db.transaction(() => {
          this.db
            .prepare(
              `UPDATE complaints SET
                status = 'Escalated to District Admin',
                is_escalated_district = 1,
                updated_at = ?
               WHERE id = ?`
            )
            .run(nowStr, c.id);

          const existingEsc = this.db
            .prepare(`SELECT id FROM escalations WHERE complaint_id = ? AND triggering_event LIKE '%14 days%'`)
            .get(c.id);

          if (!existingEsc) {
            this.db
              .prepare(
                `INSERT INTO escalations (
                  id, complaint_id, source_department, escalation_level, triggering_event,
                  missed_action_cycle, delay_reasons, responsible_party, escalation_status,
                  delivery_state, created_at, updated_at
                ) VALUES (?, ?, ?, 3, ?, 1, ?, ?, 'PENDING_REVIEW', 'dispatched', ?, ?)`
              )
              .run(
                escId,
                c.id,
                c.assigned_department,
                `Report remained Unacknowledged for more than 14 days (${daysOverdue} days elapsed). Transferred to District Admin for higher authority.`,
                `Municipal triage breach: Unacknowledged after 14 days.`,
                c.assigned_department,
                nowStr,
                nowStr
              );
          }

          this.db
            .prepare(
              `INSERT INTO complaint_history (
                id, complaint_id, previous_status, new_status, event_type,
                actor_id, actor_name, actor_role, public_update, explanation, timestamp
              ) VALUES (?, ?, ?, 'Escalated to District Admin', 'STATUTORY_ESCALATION_14D', 'system', 'District Governance Engine', 'System', ?, ?, ?)`
            )
            .run(
              histId,
              c.id,
              c.status,
              `AUTOMATIC ESCALATION: Unacknowledged for ${daysOverdue} days (exceeds 14-day statutory threshold). Transferred to District Admin for higher authority action.`,
              `Municipal body failed to acknowledge within 14 days. Escalated to District Collectorate.`,
              nowStr
            );
        });

        tx();
        escalatedIds.push(c.id);
      }
    }

    return { escalatedCount: escalatedIds.length, escalatedIds };
  }

  public getEscalatedComplaints(): Complaint[] {
    this.checkAndEscalateFourteenDayReports();
    const rows = this.db
      .prepare(
        `SELECT * FROM complaints
         WHERE is_escalated_district = 1
            OR status = 'Escalated to District Admin'
            OR (acknowledged_at IS NULL AND datetime(created_at) <= datetime(?, '-14 days'))
         ORDER BY datetime(created_at) ASC`
      )
      .all(new Date().toISOString()) as any[];

    return rows.map((r) => formatComplaintRow(r, this.db));
  }

  public districtIntervene(params: {
    complaintId: string;
    actionType: 'DIRECT_ASSIGN' | 'FORMAL_DIRECTIVE' | 'FORCE_ACKNOWLEDGE' | 'EMERGENCY_FUNDS';
    directiveText: string;
    worker?: string;
    emergencyBudget?: number;
    actor: User;
  }): Complaint | null {
    const complaint = this.getComplaintById(params.complaintId);
    if (!complaint) return null;

    const now = new Date().toISOString();
    const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const noteId = `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    let newStatus = complaint.status;
    let workerVal = complaint.assignedWorker;
    let budgetVal = complaint.budget || 0;

    if (params.actionType === 'DIRECT_ASSIGN' || params.actionType === 'EMERGENCY_FUNDS') {
      newStatus = 'In Progress';
      if (params.worker) workerVal = params.worker;
      if (params.emergencyBudget) budgetVal = params.emergencyBudget;
    } else if (params.actionType === 'FORCE_ACKNOWLEDGE') {
      newStatus = 'Acknowledged';
    }

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE complaints SET
            status = ?,
            assigned_worker = ?,
            budget = ?,
            acknowledged_at = COALESCE(acknowledged_at, ?),
            acknowledged_by = COALESCE(acknowledged_by, ?),
            acknowledged_by_name = COALESCE(acknowledged_by_name, ?),
            district_action_notes = ?,
            district_action_at = ?,
            district_action_by = ?,
            updated_at = ?
           WHERE id = ?`
        )
        .run(
          newStatus,
          workerVal || null,
          budgetVal,
          now,
          params.actor.id,
          params.actor.name,
          params.directiveText,
          now,
          params.actor.name,
          now,
          complaint.id
        );

      this.db
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, timestamp
          ) VALUES (?, ?, ?, ?, 'DISTRICT_EXECUTIVE_INTERVENTION', ?, ?, 'District Admin', ?, ?, ?)`
        )
        .run(
          histId,
          complaint.id,
          complaint.status,
          newStatus,
          params.actor.id,
          params.actor.name,
          `District Higher Authority Intervention: ${params.directiveText}${workerVal ? ` (Dispatched: ${workerVal}, Budget: $${budgetVal.toLocaleString()})` : ''}`,
          `Executive directive by ${params.actor.name}`,
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
          'District Administration & Collectorate',
          `[DISTRICT ORDER] ${params.directiveText}${budgetVal > 0 ? ` | Emergency District Allocation: $${budgetVal.toLocaleString()}` : ''}`,
          now
        );
    });

    tx();

    this.notifService.notifyFollowers({
      complaintId: complaint.id,
      type: 'DISTRICT_DIRECTIVE',
      title: 'District Higher Authority Order',
      message: `District Executive Directive issued: ${params.directiveText}${workerVal ? ` (Dispatched: ${workerVal}, Budget: $${budgetVal.toLocaleString()})` : ''}`,
      excludeUserId: params.actor.id,
    });

    return this.getComplaintById(complaint.id) || null;
  }

  public toggleFollow(complaintId: string, user: { id: string; name: string; email?: string }) {
    return this.notifService.toggleFollow(complaintId, user);
  }

  public isUserFollowing(complaintId: string, userId: string): boolean {
    return this.notifService.isUserFollowing(complaintId, userId);
  }

  public getFollowersCount(complaintId: string): number {
    return this.notifService.getFollowersCount(complaintId);
  }

  public getNotifications(userId: string) {
    return this.notifService.getNotificationsForUser(userId);
  }

  public markNotificationRead(notificationId: string, userId: string) {
    return this.notifService.markAsRead(notificationId, userId);
  }

  public markAllNotificationsRead(userId: string) {
    return this.notifService.markAllAsRead(userId);
  }

  public simulateAgeComplaint(complaintId: string, days: number = 15): Complaint | null {
    const complaint = this.getComplaintById(complaintId);
    if (!complaint) return null;

    const oldCreated = new Date(complaint.createdAt).getTime();
    const newCreated = new Date(oldCreated - days * 24 * 60 * 60 * 1000).toISOString();
    const newAckDeadline = new Date(new Date(newCreated).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    this.db
      .prepare(
        `UPDATE complaints SET
          created_at = ?,
          ack_deadline = ?,
          acknowledged_at = NULL,
          acknowledged_by = NULL,
          acknowledged_by_name = NULL,
          status = 'Submitted',
          is_escalated_district = 0
         WHERE id = ?`
      )
      .run(newCreated, newAckDeadline, complaint.id);

    // Now trigger escalation check
    this.checkAndEscalateFourteenDayReports();
    return this.getComplaintById(complaint.id) || null;
  }

  public createTestOverdueReport(params?: {
    title?: string;
    description?: string;
    category?: ComplaintCategory;
    address?: string;
    daysAged?: number;
    actor?: User;
  }): Complaint {
    const days = params?.daysAged || 15;
    const now = Date.now();
    const createdDate = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
    const ackDeadline = new Date(new Date(createdDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const countRow = this.db.prepare('SELECT count(*) as c FROM complaints').get() as { c: number };
    const refNumber = String(countRow.c + 1).padStart(3, '0');
    const reference = `CP-2026-${refNumber}`;
    const id = `cmp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const title = params?.title || 'Severe Pothole Cluster Threatening Vehicular Safety';
    const description =
      params?.description ||
      'Multiple continuous deep potholes across 2 lanes. Vehicles swerving into oncoming traffic. Unattended by municipal roads division for over 2 weeks.';
    const category = params?.category || 'road_damage';
    const address = params?.address || 'Corridor Junction 7, Central Ring Road';
    const reporterName = params?.actor?.name || 'Citizen Alex Morgan';
    const reporterId = params?.actor?.id || 'user-citizen-primary';

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO complaints (
            id, reference, title, description, category, address, locality,
            status, priority, system_recommended_priority, priority_rationale,
            priority_score, safety_risk, assigned_department, reporter_id, reporter_name,
            created_at, updated_at, votes_count, sla_hours, ack_deadline
          ) VALUES (
            ?, ?, ?, ?, ?, ?, 'Metro Ward 4',
            'Submitted', 'Critical', 'Critical', '["Severe safety risk", "High traffic arterial corridor"]',
            88, 1, 'Public Works & Roads', ?, ?,
            ?, ?, 1, 48, ?
          )`
        )
        .run(
          id,
          reference,
          title,
          description,
          category,
          address,
          reporterId,
          reporterName,
          createdDate,
          createdDate,
          ackDeadline
        );

      this.db
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, timestamp
          ) VALUES (?, ?, 'None', 'Submitted', 'SUBMITTED', ?, ?, 'Citizen', 'Complaint submitted via CivicPulse portal.', '14-Day Acknowledgement Clock Started', ?)`
        )
        .run(
          `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          id,
          reporterId,
          reporterName,
          createdDate
        );
    });

    tx();

    // Trigger immediate escalation check
    this.checkAndEscalateFourteenDayReports();
    return this.getComplaintById(id)!;
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
