import test from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrator.ts';
import { seedDatabase } from '../db/seed.ts';
import { LifecycleService } from '../services/lifecycleService.ts';

test('Complaint Lifecycle: Valid and Invalid Status Transitions', (t) => {
  // Use in-memory SQLite database for isolated unit tests
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const lifecycle = new LifecycleService(testDb);

  // 1. Valid: Submitted -> Acknowledged
  const ackResult = lifecycle.transitionStatus({
    complaintId: 'cmp-005',
    targetStatus: 'Acknowledged',
    actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
    publicUpdate: 'Officer Vance acknowledged the complaint.',
  });
  assert.strictEqual(ackResult.complaint.status, 'Acknowledged');

  // Verify event history created
  const history = testDb
    .prepare('SELECT * FROM complaint_history WHERE complaint_id = ? ORDER BY timestamp DESC')
    .all('cmp-005') as any[];
  assert.ok(history.length >= 1);
  assert.strictEqual(history[0].new_status, 'Acknowledged');
  assert.strictEqual(history[0].actor_id, 'user-official-1');

  // 2. Valid: Acknowledged -> In Progress
  const inProgressResult = lifecycle.transitionStatus({
    complaintId: 'cmp-005',
    targetStatus: 'In Progress',
    actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
  });
  assert.strictEqual(inProgressResult.complaint.status, 'In Progress');

  // 3. Invalid: Submitted directly to Closed (skipping acknowledgement & progress)
  assert.throws(
    () => {
      lifecycle.transitionStatus({
        complaintId: 'cmp-006',
        targetStatus: 'Closed',
        actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
      });
    },
    /Invalid lifecycle transition/,
    'Should reject invalid jump to Closed'
  );

  // 4. Rejection requires a valid explanation
  assert.throws(
    () => {
      lifecycle.transitionStatus({
        complaintId: 'cmp-006',
        targetStatus: 'Rejected',
        reason: 'no', // too short
        actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
      });
    },
    /detailed reason is mandatory/,
    'Should enforce minimum explanation when rejecting'
  );

  // 5. Valid rejection with reason
  const rejResult = lifecycle.transitionStatus({
    complaintId: 'cmp-006',
    targetStatus: 'Rejected',
    reason: 'Private residential property outside municipal jurisdiction.',
    actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
  });
  assert.strictEqual(rejResult.complaint.status, 'Rejected');

  // 6. Reopen rejected complaint
  const reopenResult = lifecycle.transitionStatus({
    complaintId: 'cmp-006',
    targetStatus: 'Reopened',
    reason: 'Boundary survey confirmed hazard is situated on public municipal easement.',
    actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
  });
  assert.strictEqual(reopenResult.complaint.status, 'Reopened');

  testDb.close();
});

test('Complaint Lifecycle: Closure Prevention Without Resolution Evidence', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const lifecycle = new LifecycleService(testDb);

  // Transition from In Progress to Resolved first
  lifecycle.transitionStatus({
    complaintId: 'cmp-001',
    targetStatus: 'Resolved',
    actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
    publicUpdate: 'Repairs finished, awaiting supervisory verification.',
  });

  // Attempting to close without verified evidence should fail
  assert.throws(
    () => {
      lifecycle.transitionStatus({
        complaintId: 'cmp-001',
        targetStatus: 'Closed',
        actor: { id: 'user-official-1', name: 'Marcus Vance', role: 'Municipal Official' },
      });
    },
    /Cannot close complaint without verified resolution evidence/,
    'Must prevent closing unverified complaints'
  );

  testDb.close();
});
