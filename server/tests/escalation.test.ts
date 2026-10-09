import test from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrator.ts';
import { seedDatabase } from '../db/seed.ts';
import { EscalationEngine } from '../services/escalationEngine.ts';

test('Escalation Engine: Unacknowledged Complaint Escalates After Initial Deadline', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const engine = new EscalationEngine(testDb);

  // Set all other complaints' ack_deadline to the future to isolate cmp-005
  const futureDeadline = new Date(Date.now() + 86400000).toISOString();
  testDb.prepare("UPDATE complaints SET ack_deadline = ? WHERE id != 'cmp-005'").run(futureDeadline);

  // Set ack_deadline to the past for cmp-005
  const pastDeadline = new Date(Date.now() - 3600000).toISOString(); // 1 hr ago
  testDb.prepare(`
    UPDATE complaints SET status = 'Submitted', acknowledged_at = null, ack_deadline = ?
    WHERE id = 'cmp-005'
  `).run(pastDeadline);

  // Run worker
  const res1 = engine.runEscalationWorker();
  assert.strictEqual(res1.processedMissedAcks, 1, 'Should detect 1 missed acknowledgement');

  // Verify complaint status escalated
  const complaint = testDb.prepare('SELECT status FROM complaints WHERE id = ?').get('cmp-005') as any;
  assert.strictEqual(complaint.status, 'Escalated for higher-level review');

  // Verify escalation record created
  const esc = testDb.prepare('SELECT * FROM escalations WHERE complaint_id = ?').get('cmp-005') as any;
  assert.ok(esc, 'Escalation record must exist');
  assert.strictEqual(esc.escalation_level, 3);
  assert.strictEqual(esc.escalation_status, 'PENDING_REVIEW');

  // Idempotency check: Running worker again should NOT re-escalate or duplicate
  const res2 = engine.runEscalationWorker();
  assert.strictEqual(res2.processedMissedAcks, 0, 'Must not process already-escalated complaint again');

  const count = testDb.prepare('SELECT count(*) as c FROM escalations WHERE complaint_id = ?').get('cmp-005') as any;
  assert.strictEqual(count.c, 1, 'Must have exactly 1 escalation record');

  testDb.close();
});

test('Escalation Engine: 3-Cycle Inactivity Rules After Acknowledgement', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const engine = new EscalationEngine(testDb);

  // Set all other complaints' deadlines into the future to isolate cmp-008
  const futureDeadline = new Date(Date.now() + 86400000).toISOString();
  testDb.prepare("UPDATE complaints SET next_action_deadline = ? WHERE id != 'cmp-008'").run(futureDeadline);

  // Set cmp-008 with expired next_action_deadline
  const pastDeadline = new Date(Date.now() - 7200000).toISOString();
  testDb.prepare(`
    UPDATE complaints SET
      status = 'In Progress',
      acknowledged_at = '2026-10-01T10:00:00Z',
      next_action_deadline = ?,
      inactivity_cycle = 0
    WHERE id = 'cmp-008'
  `).run(pastDeadline);

  // Cycle 1 Execution:
  const resCycle1 = engine.runEscalationWorker();
  assert.strictEqual(resCycle1.processedCycle1, 1, 'Should trigger cycle 1');

  const c1 = testDb.prepare('SELECT status, inactivity_cycle FROM complaints WHERE id = ?').get('cmp-008') as any;
  assert.strictEqual(c1.status, 'Stalled', 'Complaint must be marked Stalled');
  assert.strictEqual(c1.inactivity_cycle, 1);

  // Advance time past the new cycle 1 deadline to simulate further inactivity
  testDb.prepare(`
    UPDATE complaints SET next_action_deadline = ? WHERE id = 'cmp-008'
  `).run(pastDeadline);

  // Cycle 2 Execution:
  const resCycle2 = engine.runEscalationWorker();
  assert.strictEqual(resCycle2.processedCycle2, 1, 'Should trigger cycle 2');

  const c2 = testDb.prepare('SELECT inactivity_cycle FROM complaints WHERE id = ?').get('cmp-008') as any;
  assert.strictEqual(c2.inactivity_cycle, 2);

  // Advance time past cycle 2 deadline
  testDb.prepare(`
    UPDATE complaints SET next_action_deadline = ? WHERE id = 'cmp-008'
  `).run(pastDeadline);

  // Cycle 3 Execution: District Escalation
  const resCycle3 = engine.runEscalationWorker();
  assert.strictEqual(resCycle3.processedCycle3, 1, 'Should trigger cycle 3 district escalation');

  const c3 = testDb.prepare('SELECT status, inactivity_cycle FROM complaints WHERE id = ?').get('cmp-008') as any;
  assert.strictEqual(c3.status, 'Escalated for higher-level review');
  assert.strictEqual(c3.inactivity_cycle, 3);

  // Verify district escalation record
  const esc = testDb.prepare('SELECT * FROM escalations WHERE complaint_id = ? AND missed_action_cycle = 3').get('cmp-008') as any;
  assert.ok(esc, 'District escalation record must be present');
  assert.strictEqual(esc.escalation_level, 3);

  // Idempotency: Running scheduler repeatedly does NOT duplicate cycle 3 escalation
  const resRepeat = engine.runEscalationWorker();
  assert.strictEqual(resRepeat.processedCycle3, 0);

  const escCount = testDb.prepare('SELECT count(*) as c FROM escalations WHERE complaint_id = ?').get('cmp-008') as any;
  assert.strictEqual(escCount.c, 1, 'Must strictly maintain exactly one escalation record');

  testDb.close();
});

test('Escalation Engine: Meaningful Action Resets Deadline and Stalled Status', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const engine = new EscalationEngine(testDb);

  // Set complaint to Stalled with cycle 1
  testDb.prepare(`
    UPDATE complaints SET status = 'Stalled', inactivity_cycle = 1 WHERE id = 'cmp-001'
  `).run();

  // Record a substantive meaningful action: WORK_ORDER_CREATED
  const updated: any = engine.recordMeaningfulAction({
    complaintId: 'cmp-001',
    actionType: 'WORK_ORDER_CREATED',
    description: 'Work order #WO-8910 issued to road asphalt repair crew Alpha.',
    nextActionDeadlineHours: 48,
    actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
  });

  assert.strictEqual(updated.status, 'In Progress', 'Meaningful action must restore status from Stalled');
  assert.strictEqual(updated.inactivity_cycle, 0, 'Inactivity cycle must be reset to 0');
  assert.ok(new Date(updated.next_action_deadline).getTime() > Date.now(), 'Next action deadline must be in the future');

  // Verify history contains event
  const lastHist = testDb
    .prepare('SELECT * FROM complaint_history WHERE complaint_id = ? ORDER BY timestamp DESC LIMIT 1')
    .get('cmp-001') as any;
  assert.strictEqual(lastHist.event_type, 'WORK_ORDER_CREATED');

  testDb.close();
});

test('Escalation Engine: Blocker Bounds Next Review Date', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const engine = new EscalationEngine(testDb);

  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const blocked: any = engine.recordBlocker({
    complaintId: 'cmp-001',
    actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
    reason: 'Waiting for high-voltage power shutdown approval from Central Grid.',
    responsibleParty: 'State Electrical Transmission Authority',
    nextReviewDate: futureDate,
  });

  assert.strictEqual(blocked.status, 'Blocked');
  assert.strictEqual(blocked.is_blocked, 1);
  assert.strictEqual(blocked.blocker_review_date, futureDate);
  assert.strictEqual(blocked.next_action_deadline, futureDate);

  testDb.close();
});
