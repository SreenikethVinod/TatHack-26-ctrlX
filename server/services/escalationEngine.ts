import Database from 'better-sqlite3';
import { db } from '../db/connection.ts';

export interface MeaningfulActionInput {
  complaintId: string;
  actionType:
    | 'OFFICER_ASSIGNED'
    | 'INSPECTION_SCHEDULED'
    | 'INSPECTION_COMPLETED'
    | 'WORK_ORDER_CREATED'
    | 'REPAIR_STARTED'
    | 'SUBSTANTIVE_UPDATE'
    | 'BLOCKER_RECORDED';
  actor: {
    id: string;
    name: string;
    role: string;
    department?: string;
  };
  description: string;
  nextActionDeadlineHours?: number;
}

export interface EscalationResult {
  processedMissedAcks: number;
  processedCycle1: number;
  processedCycle2: number;
  processedCycle3: number;
  errors: string[];
}

export class EscalationEngine {
  private timer: NodeJS.Timeout | null = null;

  constructor(private database: Database.Database = db) {}

  /**
   * Records a qualifying substantive action that legally resets the next-action timer.
   */
  public recordMeaningfulAction(input: MeaningfulActionInput) {
    if (!input.description || input.description.trim().length < 8) {
      throw new Error(
        'A substantive action requires a descriptive explanation of at least 8 characters.'
      );
    }

    const complaint = this.database
      .prepare('SELECT * FROM complaints WHERE id = ? OR reference = ?')
      .get(input.complaintId, input.complaintId) as any;

    if (!complaint) {
      throw new Error(`Complaint not found: ${input.complaintId}`);
    }

    const now = new Date().toISOString();
    const nextHours = input.nextActionDeadlineHours || complaint.sla_hours || 48;
    const nextDeadline = new Date(Date.now() + nextHours * 60 * 60 * 1000).toISOString();

    const historyId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // Reset inactivity cycles and stalled state if previously stalled
    let newStatus = complaint.status;
    if (newStatus === 'Stalled') {
      newStatus = 'In Progress';
    }

    const tx = this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE complaints SET
            status = ?,
            last_action_at = ?,
            last_action_description = ?,
            next_action_deadline = ?,
            inactivity_cycle = 0,
            updated_at = ?
           WHERE id = ?`
        )
        .run(
          newStatus,
          now,
          `[${input.actionType}] ${input.description.trim()}`,
          nextDeadline,
          now,
          complaint.id
        );

      this.database
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, deadline_info, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          historyId,
          complaint.id,
          complaint.status,
          newStatus,
          input.actionType,
          input.actor.id,
          input.actor.name,
          input.actor.role || 'Municipal Official',
          `Substantive action recorded: ${input.description.trim()}`,
          `Action Type: ${input.actionType}. Next action deadline reset to ${nextDeadline}.`,
          `Next Action Deadline: ${nextDeadline}`,
          now
        );
    });

    tx();

    return this.database.prepare('SELECT * FROM complaints WHERE id = ?').get(complaint.id);
  }

  /**
   * Records an official blocker with responsible party and maximum review date.
   */
  public recordBlocker(params: {
    complaintId: string;
    actor: { id: string; name: string; role: string; department?: string };
    reason: string;
    responsibleParty: string;
    nextReviewDate: string;
  }) {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('A detailed reason is required to record a blocker.');
    }
    if (!params.responsibleParty || params.responsibleParty.trim().length < 3) {
      throw new Error('A responsible party or department is required for the blocker.');
    }
    const reviewDate = new Date(params.nextReviewDate);
    if (isNaN(reviewDate.getTime()) || reviewDate.getTime() <= Date.now()) {
      throw new Error('Next review date must be a valid future ISO date.');
    }

    const complaint = this.database
      .prepare('SELECT * FROM complaints WHERE id = ? OR reference = ?')
      .get(params.complaintId, params.complaintId) as any;

    if (!complaint) throw new Error('Complaint not found.');

    const now = new Date().toISOString();
    const historyId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const tx = this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE complaints SET
            status = 'Blocked',
            is_blocked = 1,
            blocker_reason = ?,
            blocker_party = ?,
            blocker_review_date = ?,
            next_action_deadline = ?,
            updated_at = ?
           WHERE id = ?`
        )
        .run(
          params.reason.trim(),
          params.responsibleParty.trim(),
          params.nextReviewDate,
          params.nextReviewDate,
          now,
          complaint.id
        );

      this.database
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, deadline_info, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          historyId,
          complaint.id,
          complaint.status,
          'Blocked',
          'BLOCKER_RECORDED',
          params.actor.id,
          params.actor.name,
          params.actor.role || 'Municipal Official',
          `Issue marked Blocked: ${params.reason.trim()} (Responsible: ${params.responsibleParty.trim()})`,
          `Next review scheduled for ${params.nextReviewDate}`,
          `Review Date: ${params.nextReviewDate}`,
          now
        );
    });

    tx();

    return this.database.prepare('SELECT * FROM complaints WHERE id = ?').get(complaint.id);
  }

  /**
   * Idempotent scheduled escalation worker.
   * Can be executed continuously without corrupting data or double-counting cycles.
   */
  public runEscalationWorker(): EscalationResult {
    const result: EscalationResult = {
      processedMissedAcks: 0,
      processedCycle1: 0,
      processedCycle2: 0,
      processedCycle3: 0,
      errors: [],
    };

    const now = new Date().toISOString();

    // 1. Check missed acknowledgement deadlines
    // Submitted complaints where ack_deadline has passed and acknowledged_at is null
    const unacknowledged = this.database
      .prepare(
        `SELECT * FROM complaints
         WHERE status = 'Submitted'
           AND ack_deadline IS NOT NULL
           AND ack_deadline < ?
           AND acknowledged_at IS NULL`
      )
      .all(now) as any[];

    for (const c of unacknowledged) {
      try {
        // Verify no existing escalation record for this trigger
        const existingEsc = this.database
          .prepare(
            `SELECT id FROM escalations
             WHERE complaint_id = ? AND triggering_event LIKE '%acknowledgement%'`
          )
          .get(c.id);

        if (!existingEsc) {
          const escId = `esc-ack-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

          const tx = this.database.transaction(() => {
            // Escalate to District Level directly as per prototype policy
            this.database
              .prepare(
                `INSERT INTO escalations (
                  id, complaint_id, source_department, escalation_level, triggering_event,
                  missed_action_cycle, delay_reasons, responsible_party, escalation_status,
                  delivery_state, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                escId,
                c.id,
                c.assigned_department,
                3,
                'Breach of Initial Acknowledgement Deadline (No municipal officer acknowledged the complaint).',
                0,
                'Unresponsive municipal triage queue.',
                c.assigned_department,
                'PENDING_REVIEW',
                'created',
                now,
                now
              );

            this.database
              .prepare(
                `UPDATE complaints SET
                  status = 'Escalated for higher-level review',
                  updated_at = ?
                 WHERE id = ?`
              )
              .run(now, c.id);

            this.database
              .prepare(
                `INSERT INTO complaint_history (
                  id, complaint_id, previous_status, new_status, event_type,
                  actor_id, actor_name, actor_role, public_update, explanation, deadline_info, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                histId,
                c.id,
                'Submitted',
                'Escalated for higher-level review',
                'MISSED_ACKNOWLEDGEMENT',
                'system-escalation-worker',
                'System Accountability Engine',
                'Automated Governance Bot',
                'Missed Acknowledgement SLA: Escalated to District Review Queue for supervisory intervention.',
                `Initial deadline of ${c.ack_deadline} passed without municipal officer acknowledgement.`,
                `Deadline Expired: ${c.ack_deadline}`,
                now
              );
          });

          tx();
          result.processedMissedAcks++;
        }
      } catch (err: any) {
        result.errors.push(`Error escalating complaint ${c.id}: ${err.message}`);
      }
    }

    // 2. Check missed action deadlines after acknowledgement (3-cycle rule)
    const overdueActions = this.database
      .prepare(
        `SELECT * FROM complaints
         WHERE status NOT IN ('Submitted', 'Resolved', 'Closed', 'Rejected', 'Escalated for higher-level review')
           AND is_paused = 0
           AND next_action_deadline IS NOT NULL
           AND next_action_deadline < ?`
      )
      .all(now) as any[];

    for (const c of overdueActions) {
      try {
        const cycle = c.inactivity_cycle || 0;
        const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        // Next deadline interval (e.g. 24h)
        const nextDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        if (cycle === 0) {
          // Cycle 1: Mark stalled, notify officer/supervisor
          const noteId = `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

          const tx = this.database.transaction(() => {
            this.database
              .prepare(
                `UPDATE complaints SET
                  status = 'Stalled',
                  inactivity_cycle = 1,
                  next_action_deadline = ?,
                  updated_at = ?
                 WHERE id = ?`
              )
              .run(nextDeadline, now, c.id);

            this.database
              .prepare(
                `INSERT INTO complaint_history (
                  id, complaint_id, previous_status, new_status, event_type,
                  actor_id, actor_name, actor_role, public_update, explanation, deadline_info, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                histId,
                c.id,
                c.status,
                'Stalled',
                'INACTIVITY_CYCLE_1',
                'system-escalation-worker',
                'System Accountability Engine',
                'Automated Governance Bot',
                'Accountability Alert (Cycle 1): Complaint marked Stalled due to lack of recorded progress.',
                `Action deadline of ${c.next_action_deadline} expired. Responsible supervisor notified.`,
                `Next Cycle Deadline: ${nextDeadline}`,
                now
              );

            this.database
              .prepare(
                `INSERT INTO official_notes (
                  id, complaint_id, author_id, author_name, department, note, visibility, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                noteId,
                c.id,
                'system-escalation-worker',
                'Automated Accountability Engine',
                c.assigned_department,
                `[SYSTEM ALERT - INACTIVITY CYCLE 1] Action deadline breached. Complaint flagged as Stalled. Next action required within 24 hours.`,
                'internal',
                now
              );
          });

          tx();
          result.processedCycle1++;
        } else if (cycle === 1) {
          // Cycle 2: Notify supervisor again
          const noteId = `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

          const tx = this.database.transaction(() => {
            this.database
              .prepare(
                `UPDATE complaints SET
                  inactivity_cycle = 2,
                  next_action_deadline = ?,
                  updated_at = ?
                 WHERE id = ?`
              )
              .run(nextDeadline, now, c.id);

            this.database
              .prepare(
                `INSERT INTO complaint_history (
                  id, complaint_id, previous_status, new_status, event_type,
                  actor_id, actor_name, actor_role, public_update, explanation, deadline_info, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                histId,
                c.id,
                c.status,
                c.status,
                'INACTIVITY_CYCLE_2',
                'system-escalation-worker',
                'System Accountability Engine',
                'Automated Governance Bot',
                'Accountability Alert (Cycle 2): Repeated inactivity recorded. Supervisory priority escalation triggered.',
                `Cycle 2 deadline of ${c.next_action_deadline} expired without qualifying substantive action.`,
                `Final Cycle Deadline: ${nextDeadline}`,
                now
              );

            this.database
              .prepare(
                `INSERT INTO official_notes (
                  id, complaint_id, author_id, author_name, department, note, visibility, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                noteId,
                c.id,
                'system-escalation-worker',
                'Automated Accountability Engine',
                c.assigned_department,
                `[SYSTEM ALERT - INACTIVITY CYCLE 2] Second consecutive deadline missed. Failure to record progress will trigger District-level escalation.`,
                'internal',
                now
              );
          });

          tx();
          result.processedCycle2++;
        } else if (cycle === 2) {
          // Cycle 3: Escalation to District Level
          const escId = `esc-cycle3-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

          const tx = this.database.transaction(() => {
            this.database
              .prepare(
                `INSERT INTO escalations (
                  id, complaint_id, source_department, escalation_level, triggering_event,
                  missed_action_cycle, delay_reasons, responsible_party, escalation_status,
                  delivery_state, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                escId,
                c.id,
                c.assigned_department,
                3,
                'Three consecutive missed-action cycles without substantive progress.',
                3,
                'Persistent municipal inactivity across 3 consecutive accountability cycles.',
                c.assigned_department,
                'PENDING_REVIEW',
                'created',
                now,
                now
              );

            this.database
              .prepare(
                `UPDATE complaints SET
                  status = 'Escalated for higher-level review',
                  inactivity_cycle = 3,
                  updated_at = ?
                 WHERE id = ?`
              )
              .run(now, c.id);

            this.database
              .prepare(
                `INSERT INTO complaint_history (
                  id, complaint_id, previous_status, new_status, event_type,
                  actor_id, actor_name, actor_role, public_update, explanation, deadline_info, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                histId,
                c.id,
                c.status,
                'Escalated for higher-level review',
                'DISTRICT_ESCALATION_CYCLE_3',
                'system-escalation-worker',
                'System Accountability Engine',
                'Automated Governance Bot',
                'District Escalation (Cycle 3): Complaint transferred to Metropolitan District Review Directorate due to chronic delay.',
                `Three consecutive action deadlines expired without meaningful progress. Escalation record #${escId} opened.`,
                `Escalated to District Review`,
                now
              );
          });

          tx();
          result.processedCycle3++;
        }
      } catch (err: any) {
        result.errors.push(`Error processing inactivity for ${c.id}: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Starts the background scheduler loop.
   */
  public startScheduler(intervalMs = 60000) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      try {
        this.runEscalationWorker();
      } catch (err) {
        console.error('[Escalation Engine] Scheduler worker error:', err);
      }
    }, intervalMs);
    console.log(`[Escalation Engine] In-process scheduler started with interval ${intervalMs}ms.`);
  }

  public stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const escalationEngine = new EscalationEngine();
