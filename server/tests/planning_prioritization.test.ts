import test from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrator.ts';
import { seedDatabase } from '../db/seed.ts';
import { calculatePriorityScore } from '../services/priorityService.ts';
import { PlanningService } from '../services/planningService.ts';
import { DuplicateService, haversineDistanceMeters, tokenSimilarity } from '../services/duplicateService.ts';

test('Prioritization Engine: Deterministic Formula and Normalization', () => {
  // P = 0.35S + 0.20A + 0.20R + 0.15V + 0.10L
  const rec1 = calculatePriorityScore({
    category: 'public_safety',
    safetyRisk: true,
    votesCount: 20,
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    address: 'Outside Central Hospital crosswalk',
  });

  // Verify breakdown components exist and are between 0 and 100
  assert.ok(rec1.breakdown.severity >= 0 && rec1.breakdown.severity <= 100);
  assert.ok(rec1.breakdown.age >= 0 && rec1.breakdown.age <= 100);
  assert.strictEqual(rec1.breakdown.safetyRisk, 100);
  assert.ok(rec1.breakdown.corroboration >= 0 && rec1.breakdown.corroboration <= 100);
  assert.ok(rec1.breakdown.locationImportance >= 0 && rec1.breakdown.locationImportance <= 100);
  assert.ok(rec1.score >= 0 && rec1.score <= 100);

  // Determinism check: same inputs yield exact same outputs
  const rec2 = calculatePriorityScore({
    category: 'public_safety',
    safetyRisk: true,
    votesCount: 20,
    createdAt: rec1.breakdown.age ? new Date(Date.now() - 48 * 3600000).toISOString() : undefined,
    address: 'Outside Central Hospital crosswalk',
  });
  assert.strictEqual(rec1.recommendedPriority, rec2.recommendedPriority);
  assert.strictEqual(rec1.slaHours, rec2.slaHours);

  // Edge case: Missing/empty inputs
  const recEmpty = calculatePriorityScore({
    category: 'unknown' as any,
  });
  assert.ok(recEmpty.score >= 0);
  assert.ok(recEmpty.recommendedPriority);
});

test('Maintenance Planning: Constrained Resource Allocation and FIFO Baseline', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const planning = new PlanningService(testDb);

  // Budget limit $5,000, 2 crews with 20h capacity each (Total: 40h)
  const budget = 5000;
  const crews = 2;
  const hoursPerCrew = 20;

  const plan = planning.generatePlan({
    budgetLimit: budget,
    crewCount: crews,
    hoursPerCrew: hoursPerCrew,
  });

  // 1. Budget constraint must never be exceeded
  assert.ok(
    plan.totalCost <= budget,
    `Total cost ($${plan.totalCost}) must not exceed budget ($${budget})`
  );

  // 2. Capacity constraint must never be exceeded
  assert.ok(
    plan.totalHoursUsed <= crews * hoursPerCrew,
    `Total hours used (${plan.totalHoursUsed}h) must not exceed capacity (${crews * hoursPerCrew}h)`
  );

  // 3. Must have deferred items with clear explanations
  assert.ok(plan.deferredItems.length > 0, 'Should have deferred issues due to tight constraints');
  for (const def of plan.deferredItems) {
    assert.ok(def.deferralReason, 'Every deferred item must have an explicit reason');
    assert.strictEqual(def.status, 'deferred');
  }

  // 4. Baseline FIFO comparison exists
  assert.ok(plan.baselineComparison);
  assert.ok(plan.baselineComparison.strategy.includes('FIFO'));

  testDb.close();
});

test('Duplicate Detection: Multi-signal Haversine and Token Overlap', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const duplicates = new DuplicateService(testDb);

  // Geo distance test
  const dist = haversineDistanceMeters(37.7749, -122.4194, 37.7752, -122.4190);
  assert.ok(dist < 100, 'Points close to each other should be < 100 meters');

  // Token similarity test
  const sim = tokenSimilarity(
    'Deep hazardous pothole in road lane',
    'Massive hazardous road pothole dangerous for cars'
  );
  assert.ok(sim >= 0.3, 'Keywords should have high token similarity');

  // Scan duplicates for cmp-001
  const matches = duplicates.findPotentialDuplicates('cmp-001');
  assert.ok(Array.isArray(matches));

  // Linking and confirming duplicate
  const link = duplicates.linkDuplicate({
    complaintId: 'cmp-004',
    canonicalComplaintId: 'cmp-001',
    confidenceScore: 0.85,
    reason: 'Identical road damage within 50m of school',
  });
  assert.ok(link.id);

  const confirmRes = duplicates.confirmDuplicate(link.id, 'user-official-2');
  assert.strictEqual(confirmRes.success, true);
  assert.strictEqual(confirmRes.status, 'confirmed');

  // Verify complaints now share the maintenance issue ID
  const c1 = testDb.prepare('SELECT maintenance_issue_id FROM complaints WHERE id = ?').get('cmp-001') as any;
  const c4 = testDb.prepare('SELECT maintenance_issue_id FROM complaints WHERE id = ?').get('cmp-004') as any;
  assert.ok(c1.maintenance_issue_id);
  assert.strictEqual(c1.maintenance_issue_id, c4.maintenance_issue_id);

  testDb.close();
});
