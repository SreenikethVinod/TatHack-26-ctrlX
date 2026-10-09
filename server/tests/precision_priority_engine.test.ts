import test from 'node:test';
import assert from 'node:assert';
import { calculatePriorityScore } from '../services/priorityService.ts';
import { verifyAndTriageImage } from '../../ai-module/engine.ts';

test('Precision Priority Engine: Semantic Description Hazard Triage', () => {
  // Case A: Critical acute physical hazard described (exposed live wire)
  const criticalRec = calculatePriorityScore({
    category: 'streetlights', // Baseline streetlights is normally S=50
    title: 'Exposed live wire sparking on ground',
    description: 'There is an exposed live wire sparking near the sidewalk with risk of electric shock',
    safetyRisk: false, // Even if citizen forgot checkbox, semantics infer hazard
  });

  assert.ok(
    criticalRec.breakdown.severity >= 80,
    `Severity should be elevated by acute live wire markers (got ${criticalRec.breakdown.severity})`
  );
  assert.ok(
    criticalRec.breakdown.safetyRisk >= 85,
    `Safety risk should be inferred from acute electric shock hazard (got ${criticalRec.breakdown.safetyRisk})`
  );
  assert.strictEqual(criticalRec.recommendedPriority, 'Critical');
  assert.strictEqual(criticalRec.slaHours, 24);
  assert.ok(
    criticalRec.rationale.some((r) => r.includes('Critical acute hazard identified') || r.includes('live wire')),
    'Rationale should explain critical acute hazard identification'
  );

  // Case B: Superficial cosmetic issue with mild wording
  const cosmeticRec = calculatePriorityScore({
    category: 'road_damage', // Baseline road_damage is normally S=75
    title: 'Minor cosmetic hairline crack',
    description: 'Just a minor hairline crack on asphalt, cosmetic only and non urgent with low traffic',
    safetyRisk: false,
  });

  assert.ok(
    cosmeticRec.breakdown.severity <= 40,
    `Severity should be moderated for cosmetic hairline crack (got ${cosmeticRec.breakdown.severity})`
  );
  assert.strictEqual(cosmeticRec.breakdown.safetyRisk, 0);
  assert.ok(
    ['Low', 'Medium'].includes(cosmeticRec.recommendedPriority),
    `Cosmetic issue should have Low/Medium priority (got ${cosmeticRec.recommendedPriority})`
  );
  assert.ok(
    cosmeticRec.rationale.some((r) => r.includes('cosmetic') || r.includes('moderated')),
    'Rationale should detail cosmetic moderation'
  );

  // Case C: Vulnerable pedestrian markers
  const vulnRec = calculatePriorityScore({
    category: 'road_damage',
    title: 'Pothole on pedestrian pathway',
    description: 'Deep hole where school children crossing and elderly fallen yesterday',
    safetyRisk: false,
  });

  assert.ok(
    vulnRec.breakdown.severity >= 85,
    `Vulnerable population presence should boost severity (got ${vulnRec.breakdown.severity})`
  );
  assert.ok(
    vulnRec.rationale.some((r) => r.includes('Vulnerability Impact') || r.includes('school children')),
    'Rationale should note vulnerable pedestrian risk'
  );
});

test('Precision Priority Engine: Photo Metadata Location Verification & Discrepancy Guardrail', () => {
  // Case A: On-site cryptographic photo verification (within 25m)
  const onSiteRec = calculatePriorityScore({
    category: 'drainage',
    title: 'Blocked storm drain',
    description: 'Blocked drain causing pooling water',
    photoMetadata: {
      timestamp: new Date().toISOString(),
      distanceMeters: 25,
      status: 'VERIFIED',
    },
    photoDistanceMeters: 25,
    locationMatchStatus: 'VERIFIED',
    address: 'Near Central Railway Station',
  });

  assert.ok(
    onSiteRec.breakdown.locationImportance >= 85,
    `Transit location + verified on-site photo should have high location score (got ${onSiteRec.breakdown.locationImportance})`
  );
  assert.ok(
    onSiteRec.rationale.some((r) => r.includes('Photo GPS Verification') || r.includes('on-site')),
    'Rationale should explicitly confirm photo GPS verification'
  );

  // Case B: Severe location discrepancy (> 300m away / FLAGGED_MISMATCH)
  const mismatchRec = calculatePriorityScore({
    category: 'public_safety',
    title: 'Major street issue',
    description: 'Severe pothole and cave in',
    safetyRisk: true,
    photoDistanceMeters: 1850, // 1.85km away
    locationMatchStatus: 'FLAGGED_MISMATCH',
    address: 'Near City Hospital Emergency Entrance',
  });

  // Guardrail test: raw score must be capped at 65 pending physical audit
  assert.ok(
    mismatchRec.score <= 65,
    `Score should be capped at 65 when photo location is flagged mismatch (got ${mismatchRec.score})`
  );
  assert.ok(
    mismatchRec.rationale.some((r) => r.includes('Photo Location Anomaly') || r.includes('capped at 65')),
    'Rationale should note photo location anomaly guardrail'
  );
});

test('Precision Priority Engine: AI Forensics Module Image & Semantic Evaluation', async () => {
  const result = await verifyAndTriageImage({
    title: 'Open manhole on school crossing',
    description: 'Uncovered manhole with missing lid right outside kindergarten gate where school kids cross',
    category: 'public_safety',
    safetyRisk: true,
    photoDistanceMeters: 15,
    locationMatchStatus: 'VERIFIED',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7',
  });

  assert.strictEqual(result.isAuthentic, true);
  assert.strictEqual(result.verdict, 'VERIFIED_REAL');
  assert.strictEqual(result.visualSeverity, 'Critical');
  assert.ok(result.severityScore >= 80, `Severity score should reflect acute open manhole hazard (got ${result.severityScore})`);
  assert.ok(
    result.severityRationale.some((r) => r.includes('Acute critical hazard') || r.includes('School')),
    'AI rationale should reflect semantic hazard triage'
  );
});
