import Database from 'better-sqlite3';
import { db } from '../db/connection.ts';
import { UserResponse } from './authService.ts';

export type LifecycleStatus =
  | 'Submitted'
  | 'Pending review'
  | 'Under review'
  | 'Acknowledged'
  | 'Approved/prioritised'
  | 'Scheduled'
  | 'In Progress'
  | 'Stalled'
  | 'Blocked'
  | 'Resolved, awaiting verification'
  | 'Resolved'
  | 'Closed'
  | 'More information required'
  | 'Rejected'
  | 'Deferred'
  | 'Reopened'
  | 'Escalated for higher-level review';

// Map of canonical status to acceptable case/aliases
export function normalizeStatus(status: string): LifecycleStatus {
  const s = status.trim();
  if (s.toLowerCase() === 'in progress') return 'In Progress';
  if (s.toLowerCase() === 'submitted') return 'Submitted';
  if (s.toLowerCase() === 'acknowledged') return 'Acknowledged';
  if (s.toLowerCase() === 'resolved') return 'Resolved';
  if (s.toLowerCase() === 'rejected') return 'Rejected';
  if (s.toLowerCase() === 'closed') return 'Closed';
  if (s.toLowerCase() === 'stalled') return 'Stalled';
  if (s.toLowerCase() === 'blocked') return 'Blocked';
  if (s.toLowerCase() === 'reopened') return 'Reopened';
  if (s.toLowerCase() === 'deferred') return 'Deferred';
  if (s.toLowerCase() === 'scheduled') return 'Scheduled';
  if (s.toLowerCase() === 'approved/prioritised' || s.toLowerCase() === 'approved') return 'Approved/prioritised';
  if (s.toLowerCase() === 'under review') return 'Under review';
  if (s.toLowerCase() === 'pending review') return 'Pending review';
  if (s.toLowerCase() === 'resolved, awaiting verification') return 'Resolved, awaiting verification';
  if (s.toLowerCase() === 'more information required') return 'More information required';
  if (s.toLowerCase() === 'escalated for higher-level review' || s.toLowerCase() === 'escalated') return 'Escalated for higher-level review';
  return s as LifecycleStatus;
}

// Transition graph: allowed source states for each target state
const ALLOWED_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  Submitted: ['More information required', 'Reopened'],
  'Pending review': ['Submitted', 'Reopened'],
  'Under review': ['Submitted', 'Pending review', 'More information required', 'Reopened', 'Escalated for higher-level review'],
  Acknowledged: [
    'Submitted',
    'Pending review',
    'Under review',
    'More information required',
    'Reopened',
    'Escalated for higher-level review',
  ],
  'Approved/prioritised': ['Acknowledged', 'Deferred', 'Reopened'],
  Scheduled: ['Acknowledged', 'Approved/prioritised', 'Deferred'],
  'In Progress': [
    'Submitted', // Permit direct start if urgent
    'Acknowledged',
    'Approved/prioritised',
    'Scheduled',
    'Stalled',
    'Blocked',
    'Deferred',
    'Reopened',
    'Escalated for higher-level review',
  ],
  Stalled: ['Acknowledged', 'Approved/prioritised', 'Scheduled', 'In Progress'],
  Blocked: ['Acknowledged', 'Approved/prioritised', 'Scheduled', 'In Progress', 'Stalled'],
  'Resolved, awaiting verification': ['In Progress', 'Scheduled', 'Acknowledged'],
  Resolved: ['In Progress', 'Resolved, awaiting verification', 'Acknowledged', 'Scheduled'],
  Closed: ['Resolved, awaiting verification', 'Resolved'],
  'More information required': ['Submitted', 'Pending review', 'Under review', 'Acknowledged'],
  Rejected: ['Submitted', 'Pending review', 'Under review', 'Acknowledged', 'More information required'],
  Deferred: ['Acknowledged', 'Approved/prioritised', 'Scheduled', 'In Progress', 'Blocked'],
  Reopened: ['Resolved', 'Closed', 'Rejected'],
  'Escalated for higher-level review': ['Submitted', 'Acknowledged', 'In Progress', 'Stalled', 'Blocked'],
};

export interface StatusTransitionRequest {
  complaintId: string;
  targetStatus: string;
  actor: {
    id: string;
    name: string;
    role: string;
    systemRole?: string;
  };
  reason?: string;
  publicUpdate?: string;
  resolutionSummary?: string;
  afterImageUrl?: string;
  blockerDetails?: {
    reason: string;
    responsibleParty: string;
    nextReviewDate: string;
  };
  bypassVerificationCheck?: boolean; // Only for admin emergency overrides
}

export class LifecycleService {
  constructor(private database: Database.Database = db) {}

  public validateTransition(currentStatus: LifecycleStatus, targetStatus: LifecycleStatus): boolean {
    if (currentStatus === targetStatus) return true;
    const allowedSources = ALLOWED_TRANSITIONS[targetStatus];
    if (!allowedSources) return false;
    return allowedSources.includes(currentStatus);
  }

  public transitionStatus(params: StatusTransitionRequest) {
    const normTarget = normalizeStatus(params.targetStatus);

    const complaint = this.database
      .prepare('SELECT * FROM complaints WHERE id = ? OR reference = ?')
      .get(params.complaintId, params.complaintId) as any;

    if (!complaint) {
      throw new Error(`Complaint not found with ID/reference: ${params.complaintId}`);
    }

    const normCurrent = normalizeStatus(complaint.status);

    if (normCurrent === normTarget) {
      // Idempotent state change or update
      return { complaint, unchanged: true };
    }

    if (!this.validateTransition(normCurrent, normTarget)) {
      throw new Error(
        `Invalid lifecycle transition: Cannot move from "${normCurrent}" to "${normTarget}".`
      );
    }

    // Validation checks for specific states
    if (normTarget === 'Rejected' && (!params.reason || params.reason.trim().length < 5)) {
      throw new Error('A detailed reason is mandatory when rejecting a civic complaint.');
    }

    if (normTarget === 'Deferred' && (!params.reason || params.reason.trim().length < 5)) {
      throw new Error('A detailed justification is mandatory when deferring a civic complaint.');
    }

    if (normTarget === 'Reopened' && (!params.reason || params.reason.trim().length < 5)) {
      throw new Error('An official explanation is required when reopening a resolved complaint.');
    }

    if (normTarget === 'Blocked') {
      if (
        !params.blockerDetails ||
        !params.blockerDetails.reason ||
        !params.blockerDetails.responsibleParty ||
        !params.blockerDetails.nextReviewDate
      ) {
        throw new Error(
          'Marking a complaint as Blocked requires a reason, responsible party, and scheduled next review date.'
        );
      }
    }

    // Closure / Resolution verification checks
    if (normTarget === 'Closed' && !params.bypassVerificationCheck) {
      // Check if resolution evidence has been verified
      const verifiedEvidence = this.database
        .prepare(
          `SELECT count(*) as c FROM attachments
           WHERE complaint_id = ? AND evidence_type = 'resolution' AND verification_status = 'verified'`
        )
        .get(complaint.id) as { c: number };

      const verifiedRecord = this.database
        .prepare(
          `SELECT count(*) as c FROM resolution_verifications
           WHERE complaint_id = ? AND status = 'verified'`
        )
        .get(complaint.id) as { c: number };

      const hasVerification = verifiedEvidence.c > 0 || verifiedRecord.c > 0;
      if (!hasVerification && !complaint.after_image_url && !params.afterImageUrl) {
        throw new Error(
          'Cannot close complaint without verified resolution evidence or photographic proof.'
        );
      }
    }

    const now = new Date().toISOString();
    let resolvedAt = complaint.resolved_at;
    let resolutionSummary = complaint.resolution_summary;
    let afterImageUrl = complaint.after_image_url;

    if (normTarget === 'Resolved' || normTarget === 'Closed' || normTarget === 'Resolved, awaiting verification') {
      resolvedAt = now;
      if (params.resolutionSummary) resolutionSummary = params.resolutionSummary;
      if (params.afterImageUrl) afterImageUrl = params.afterImageUrl;
    } else if (normTarget === 'Reopened') {
      resolvedAt = null;
    }

    // Blocker fields
    const isBlocked = normTarget === 'Blocked' ? 1 : 0;
    const blockerReason = normTarget === 'Blocked' ? params.blockerDetails?.reason : null;
    const blockerParty = normTarget === 'Blocked' ? params.blockerDetails?.responsibleParty : null;
    const blockerReviewDate = normTarget === 'Blocked' ? params.blockerDetails?.nextReviewDate : null;

    // Acknowledgement timestamp
    let acknowledgedAt = complaint.acknowledged_at;
    if (normTarget === 'Acknowledged' && !acknowledgedAt) {
      acknowledgedAt = now;
    }

    // History event
    const historyId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const publicUpdate =
      params.publicUpdate ||
      params.reason ||
      (normTarget === 'Resolved' && resolutionSummary
        ? `Issue marked Resolved: ${resolutionSummary}`
        : `Status changed from ${normCurrent} to ${normTarget}.`);

    const executeTransition = this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE complaints SET
            status = ?,
            updated_at = ?,
            resolved_at = ?,
            resolution_summary = ?,
            after_image_url = ?,
            acknowledged_at = ?,
            is_blocked = ?,
            blocker_reason = ?,
            blocker_party = ?,
            blocker_review_date = ?
           WHERE id = ?`
        )
        .run(
          normTarget,
          now,
          resolvedAt,
          resolutionSummary,
          afterImageUrl,
          acknowledgedAt,
          isBlocked,
          blockerReason,
          blockerParty,
          blockerReviewDate,
          complaint.id
        );

      this.database
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          historyId,
          complaint.id,
          normCurrent,
          normTarget,
          'STATUS_CHANGED',
          params.actor.id,
          params.actor.name,
          params.actor.role || 'Municipal Official',
          publicUpdate,
          params.reason || null,
          now
        );
    });

    executeTransition();

    const updated = this.database.prepare('SELECT * FROM complaints WHERE id = ?').get(complaint.id) as any;
    const historyEntry = this.database.prepare('SELECT * FROM complaint_history WHERE id = ?').get(historyId) as any;

    return {
      complaint: updated,
      historyEntry,
      unchanged: false,
    };
  }
}

export const lifecycleService = new LifecycleService();
