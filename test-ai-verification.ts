import 'dotenv/config';
import { verifyAndTriageReport } from './server/services/aiVerificationEngine.ts';
import { db } from './server/db.ts';

async function runTestSuite() {
  console.log('='.repeat(70));
  console.log('  CIVICPULSE AI VERIFICATION & SEVERITY TRIAGE ENGINE TEST SUITE');
  console.log('='.repeat(70));
  console.log(
    `Gemini API Key: ${
      process.env.GEMINI_API_KEY
        ? 'Present (Multimodal Gemini 3.8 Flash enabled)'
        : 'Not Set (Heuristic & Forensic fallback mode active)'
    }`
  );
  console.log('-'.repeat(70));

  const existingComplaints = db.getComplaints();
  let passedCount = 0;
  let totalTests = 0;

  function assertTest(testName: string, condition: boolean, details: string) {
    totalTests++;
    if (condition) {
      passedCount++;
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName} -> ${details}`);
    }
  }

  // TEST 1: Authentic Real Photo + High Severity Pothole
  console.log('\n--- 1. Testing Authentic Real-World Incident Photo ---');
  const test1 = await verifyAndTriageReport({
    title: 'Deep Hazardous Pothole on Arterial Road',
    description: 'Dangerous 8-inch asphalt crater damaging car suspensions and causing bike crashes.',
    category: 'road_damage',
    address: '880 Grand Avenue',
    latitude: 37.785,
    longitude: -122.405,
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    safetyRisk: true,
    existingComplaints,
  });
  console.log('  Verdict:', test1.verdict);
  console.log('  Authenticity Score:', `${test1.authenticityScore}%`);
  console.log('  Relevance Score:', `${test1.relevanceScore}%`);
  console.log('  Visual Severity:', `${test1.visualSeverity} (${test1.severityScore}/100)`);
  console.log('  Detected Objects:', test1.detectedObjects.join(', '));
  console.log('  Severity Rationale:', test1.severityRationale);

  assertTest('Test 1.1: Verdict is VERIFIED_REAL', test1.verdict === 'VERIFIED_REAL', `Got: ${test1.verdict}`);
  assertTest('Test 1.2: Authenticity Score >= 80%', test1.authenticityScore >= 80, `Got: ${test1.authenticityScore}%`);
  assertTest(
    'Test 1.3: Visual Severity is Critical or High',
    test1.visualSeverity === 'Critical' || test1.visualSeverity === 'High',
    `Got: ${test1.visualSeverity}`
  );
  assertTest('Test 1.4: No Fraud Flag', !test1.fraudFlag, `Got: ${test1.fraudFlag}`);

  // TEST 2: AI-Generated / Synthetic Image Detection
  console.log('\n--- 2. Testing AI-Generated / Synthetic Image Detection ---');
  const test2 = await verifyAndTriageReport({
    title: 'Synthetic AI Pothole Rendered Scene',
    description: 'This is an image produced by a diffusion model showing a fake street crater.',
    category: 'road_damage',
    address: '404 Simulation Boulevard',
    imageUrl: 'https://example.com/assets/synthetic_pothole_midjourney_diffusion.jpg',
    safetyRisk: false,
    existingComplaints,
  });
  console.log('  Verdict:', test2.verdict);
  console.log('  AI Generated Probability:', `${test2.aiGeneratedProbability}%`);
  console.log('  Authenticity Score:', `${test2.authenticityScore}%`);
  console.log('  Fraud Flag:', test2.fraudFlag);
  console.log('  Fraud Reason:', test2.fraudReason);

  assertTest('Test 2.1: Verdict is SUSPICIOUS_AI', test2.verdict === 'SUSPICIOUS_AI', `Got: ${test2.verdict}`);
  assertTest(
    'Test 2.2: AI Generated Probability >= 65%',
    test2.aiGeneratedProbability >= 65,
    `Got: ${test2.aiGeneratedProbability}%`
  );
  assertTest('Test 2.3: Fraud Flag is true', test2.fraudFlag === true, `Got: ${test2.fraudFlag}`);
  assertTest('Test 2.4: Authenticity is false', test2.isAuthentic === false, `Got: ${test2.isAuthentic}`);

  // TEST 3: Recycled Image Abuse (Duplicate image already in database CP-2026-001)
  console.log('\n--- 3. Testing Recycled Image Fraud Detection ---');
  const test3 = await verifyAndTriageReport({
    title: 'New Pothole in Downtown (Recycled Photo)',
    description: 'Reporting a pothole using an image already submitted in another complaint.',
    category: 'road_damage',
    address: '99 Market Street',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    existingComplaints,
  });
  console.log('  Verdict:', test3.verdict);
  console.log('  Fraud Flag:', test3.fraudFlag);
  console.log('  Fraud Reason:', test3.fraudReason);
  console.log('  Authenticity Score:', `${test3.authenticityScore}%`);

  assertTest('Test 3.1: Verdict is NEEDS_INSPECTION', test3.verdict === 'NEEDS_INSPECTION', `Got: ${test3.verdict}`);
  assertTest('Test 3.2: Fraud Flag is true', test3.fraudFlag === true, `Got: ${test3.fraudFlag}`);
  assertTest(
    'Test 3.3: Reason references duplicate report CP-2026-001',
    Boolean(test3.fraudReason?.includes('CP-2026-001')),
    `Got: ${test3.fraudReason}`
  );

  // TEST 4: Irrelevant Image Submission (Cute cat / meme photo for drainage problem)
  console.log('\n--- 4. Testing Irrelevant Image Detection ---');
  const test4 = await verifyAndTriageReport({
    title: 'Drainage blockage with unrelated pet photo',
    description: 'Submitted with a cute cat photo instead of stormwater drain evidence.',
    category: 'drainage',
    address: '500 Elm Street',
    imageUrl: 'https://example.com/cute_cat_photo.jpg',
    existingComplaints,
  });
  console.log('  Verdict:', test4.verdict);
  console.log('  Relevance Score:', `${test4.relevanceScore}%`);
  console.log('  Is Relevant:', test4.isRelevant);
  console.log('  Fraud Reason:', test4.fraudReason);

  assertTest('Test 4.1: Verdict is IRRELEVANT', test4.verdict === 'IRRELEVANT', `Got: ${test4.verdict}`);
  assertTest('Test 4.2: Relevance Score < 50%', test4.relevanceScore < 50, `Got: ${test4.relevanceScore}%`);
  assertTest('Test 4.3: Is Relevant is false', test4.isRelevant === false, `Got: ${test4.isRelevant}`);

  // TEST 5: Critical Public Safety Incident (Exposed high voltage wire with safetyRisk)
  console.log('\n--- 5. Testing Critical Public Safety Severity Triage ---');
  const test5 = await verifyAndTriageReport({
    title: 'Exposed Live Wire Sparking on Sidewalk Near School',
    description:
      'Severe electrical hazard. Exposed wire sparking and posing immediate electric shock danger to pedestrians.',
    category: 'public_safety',
    address: '100 School Lane',
    imageUrl: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=800&q=80',
    safetyRisk: true,
    existingComplaints,
  });
  console.log('  Visual Severity:', test5.visualSeverity);
  console.log('  Severity Score:', `${test5.severityScore}/100`);
  console.log('  Severity Rationale:', test5.severityRationale);

  assertTest('Test 5.1: Visual Severity is Critical', test5.visualSeverity === 'Critical', `Got: ${test5.visualSeverity}`);
  assertTest('Test 5.2: Severity Score >= 80', test5.severityScore >= 80, `Got: ${test5.severityScore}`);

  // TEST 6: Low Severity Incident (Faded road markings or minor litter)
  console.log('\n--- 6. Testing Low Severity Triage ---');
  const test6 = await verifyAndTriageReport({
    title: 'Faded white line in parking bay',
    description: 'Slight paint fade on the lane divider in parking lot.',
    category: 'road_damage',
    address: 'Parking Lot C',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    safetyRisk: false,
    existingComplaints,
  });
  console.log('  Visual Severity:', test6.visualSeverity);
  console.log('  Severity Score:', `${test6.severityScore}/100`);

  assertTest('Test 6.1: Severity Score <= 60', test6.severityScore <= 60, `Got: ${test6.severityScore}`);

  // TEST 7: Spatial Corroboration (Clustering near existing complaint coordinates)
  console.log('\n--- 7. Testing Spatial Corroboration Engine ---');
  const test7 = await verifyAndTriageReport({
    title: 'Another pothole 200m away on 4th Ave',
    description: 'Another severe road rupture right beside middle school.',
    category: 'road_damage',
    address: '780 4th Avenue',
    latitude: 37.7752,
    longitude: -122.4192,
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    existingComplaints,
  });
  console.log('  Corroborating Reports Count:', test7.corroboratingReportsCount);
  console.log('  Spatial Cluster Info:', test7.spatialClusterInfo);

  assertTest('Test 7.1: Corroborating count >= 1', test7.corroboratingReportsCount >= 1, `Got: ${test7.corroboratingReportsCount}`);
  assertTest(
    'Test 7.2: Cluster Info includes radius mention',
    Boolean(test7.spatialClusterInfo?.includes('600m radius')),
    `Got: ${test7.spatialClusterInfo}`
  );

  // TEST 8: Live HTTP API Endpoint Verification
  console.log('\n--- 8. Testing Live API Endpoint (POST /api/complaints/verify) ---');
  const targetPort = process.env.PORT || 3000;
  try {
    const res = await fetch(`http://localhost:${targetPort}/api/complaints/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Deep sinkhole opening up on roadway',
        description: 'Major road collapse and deep sinkhole blocking traffic lanes.',
        category: 'road_damage',
        address: '55 Ocean Boulevard',
        safetyRisk: true,
        imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
      }),
    });
    const data = (await res.json()) as any;
    console.log('  HTTP Status:', res.status);
    console.log('  API Success:', data.success);
    console.log('  API Verification Verdict:', data.verification?.verdict);
    console.log('  API Visual Severity:', data.verification?.visualSeverity);

    assertTest('Test 8.1: HTTP 200 OK', res.status === 200, `Got: ${res.status}`);
    assertTest('Test 8.2: Payload success is true', data.success === true, `Got: ${data.success}`);
    assertTest(
      'Test 8.3: Verification verdict is present',
      Boolean(data.verification?.verdict),
      `Got: ${data.verification?.verdict}`
    );
    assertTest(
      'Test 8.4: Visual Severity is Critical or High',
      data.verification?.visualSeverity === 'Critical' || data.verification?.visualSeverity === 'High',
      `Got: ${data.verification?.visualSeverity}`
    );
  } catch (err: any) {
    console.error('  HTTP API test failed to connect:', err.message);
    assertTest('Test 8.1: HTTP API response', false, err.message);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(
    `TEST SUMMARY: ${passedCount} / ${totalTests} assertions passed (${Math.round((passedCount / totalTests) * 100)}%)`
  );
  console.log('='.repeat(70));

  if (passedCount === totalTests) {
    console.log('ALL AI VERIFICATION AND SEVERITY TESTS PASSED SUCCESSFULLY! 🎉\n');
  } else {
    console.error('SOME TESTS FAILED! Please inspect output above.\n');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
