import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrator.ts';
import { seedDatabase } from '../db/seed.ts';
import { DatabaseRepository } from '../db.ts';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  seedDatabase(db);
  return db;
}

test('In-App Camera Photo Verification: Verified On-Site Match', () => {
  const testDb = createTestDb();
  const repo = new DatabaseRepository(testDb);

  const reportedLat = 12.9716;
  const reportedLng = 77.5946;

  // Photo taken on-site (~15 meters away)
  const photoLat = 12.9717;
  const photoLng = 77.5947;
  const fingerprint = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const complaint = repo.createComplaint({
    title: 'Burst Water Pipe on Residency Road',
    description: 'High pressure drinking water pipe ruptured and flooding the sidewalk.',
    category: 'water_supply',
    address: '42 Residency Road, Richmond Town',
    locality: 'Central Ward',
    latitude: reportedLat,
    longitude: reportedLng,
    safetyRisk: true,
    reporterId: 'user-citizen-1',
    reporterName: 'John Doe',
    imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    photoFingerprint: fingerprint,
    photoMetadata: {
      capturedAt: new Date().toISOString(),
      captureSource: 'in_app_camera',
      dimensions: { width: 1280, height: 720 },
      deviceGps: { latitude: photoLat, longitude: photoLng, accuracy: 8 },
      fingerprint,
    },
  });

  assert.ok(complaint.id);
  assert.equal(complaint.photoFingerprint, fingerprint);
  assert.equal(complaint.isFlaggedLocationMismatch, false);
  assert.equal(complaint.locationMatchStatus, 'VERIFIED');
  assert.ok(
    complaint.photoDistanceMeters !== undefined &&
      complaint.photoDistanceMeters !== null &&
      complaint.photoDistanceMeters <= 300
  );
  assert.ok(complaint.photoMetadata);
  assert.equal(complaint.photoMetadata.captureSource, 'in_app_camera');
});

test('In-App Camera Photo Verification: Flagged Location Discrepancy (>300m Away)', () => {
  const testDb = createTestDb();
  const repo = new DatabaseRepository(testDb);

  // Reported incident location: Richmond Town
  const reportedLat = 12.9716;
  const reportedLng = 77.5946;

  // Photo captured 2.5km away in Indiranagar
  const photoLat = 12.9784;
  const photoLng = 77.6408;
  const fingerprint = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';

  const complaint = repo.createComplaint({
    title: 'Broken Guardrail Near Metro Pillar 140',
    description: 'Sharp metal guardrail damaged and dangling into traffic lane.',
    category: 'public_safety',
    address: 'MG Road Metro Pillar 140',
    locality: 'Central Ward',
    latitude: reportedLat,
    longitude: reportedLng,
    safetyRisk: true,
    reporterId: 'user-citizen-2',
    reporterName: 'Jane Smith',
    imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    photoFingerprint: fingerprint,
    photoMetadata: {
      capturedAt: new Date().toISOString(),
      captureSource: 'in_app_camera',
      dimensions: { width: 1280, height: 720 },
      deviceGps: { latitude: photoLat, longitude: photoLng, accuracy: 12 },
      fingerprint,
    },
  });

  assert.ok(complaint.id);
  assert.equal(complaint.photoFingerprint, fingerprint);
  // Crucial check: Must be flagged as location mismatch
  assert.equal(complaint.isFlaggedLocationMismatch, true);
  assert.equal(complaint.locationMatchStatus, 'FLAGGED_MISMATCH');
  assert.ok(
    complaint.photoDistanceMeters !== undefined &&
      complaint.photoDistanceMeters !== null &&
      complaint.photoDistanceMeters > 300
  );

  // Check audit history includes location discrepancy event
  const history = repo.getComplaintHistory(complaint.id);
  const flagEvent = history.find((h) => h.eventType === 'FLAGGED_MISMATCH');
  assert.ok(flagEvent, 'Must log FLAGGED_MISMATCH history event for official audit');
  assert.match(flagEvent.publicUpdate, /Location Discrepancy Flagged/i);
});

test('In-App Camera Photo Verification: Handled Gracefully When No Photo Provided', () => {
  const testDb = createTestDb();
  const repo = new DatabaseRepository(testDb);

  const complaint = repo.createComplaint({
    title: 'Streetlight completely dark',
    description: 'Four sodium lamps out along 8th cross road for three nights.',
    category: 'streetlights',
    address: '8th Cross, Malleshwaram',
    locality: 'North Ward',
    latitude: 13.0031,
    longitude: 77.5643,
    safetyRisk: false,
    reporterId: 'user-citizen-1',
    reporterName: 'John Doe',
  });

  assert.ok(complaint.id);
  assert.equal(complaint.isFlaggedLocationMismatch, false);
  assert.equal(complaint.locationMatchStatus, 'NO_PHOTO');
  assert.equal(complaint.photoFingerprint, null);
  assert.equal(complaint.photoDistanceMeters, null);
});
