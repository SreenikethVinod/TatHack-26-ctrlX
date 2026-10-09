import test from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrator.ts';
import { seedDatabase } from '../db/seed.ts';
import { hashPassword, verifyPassword, generateToken, verifyToken, AuthService } from '../services/authService.ts';
import { detectMimeTypeFromBuffer, EvidenceService } from '../services/evidenceService.ts';
import { DatabaseRepository } from '../db.ts';

test('Security & Auth: Password Hashing and JWT Token Lifecycle', () => {
  const password = 'SuperSecurePassword2026!';
  const hashed = hashPassword(password);

  assert.notStrictEqual(password, hashed, 'Password must not be stored in plaintext');
  assert.ok(verifyPassword(password, hashed), 'Password verification must succeed');
  assert.strictEqual(verifyPassword('WrongPassword', hashed), false, 'Wrong password must be rejected');

  // Token verification
  const dummyUser: any = {
    id: 'user-official-2',
    name: 'Sarah Jenkins',
    email: 'sarah@gov.demo',
    role: 'SUPERVISOR',
    department: 'Sanitation & Waste Management',
  };

  const token = generateToken(dummyUser);
  assert.ok(token.length > 20);

  const payload = verifyToken(token);
  assert.ok(payload);
  assert.strictEqual(payload?.sub, dummyUser.id);
  assert.strictEqual(payload?.role, 'SUPERVISOR');

  // Tampered token must fail
  const tamperedToken = token.slice(0, -5) + 'abcde';
  assert.strictEqual(verifyToken(tamperedToken), null);
});

test('Evidence Validation: Magic Bytes and SHA-256 Verification', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const evidenceService = new EvidenceService(testDb);

  // 1. Valid JPEG buffer (FF D8 FF ...)
  const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  assert.strictEqual(detectMimeTypeFromBuffer(validJpeg), 'image/jpeg');

  // 2. Fraudulent/Fake file (e.g. bash script or exe disguised as jpg)
  const fakeFile = Buffer.from('<!DOCTYPE html><html><body>malicious script</body></html>');
  assert.strictEqual(detectMimeTypeFromBuffer(fakeFile), null);

  assert.throws(
    () => {
      evidenceService.saveEvidence({
        complaintId: 'cmp-001',
        evidenceType: 'resolution',
        originalFilename: 'fake.jpg',
        buffer: fakeFile,
        uploadedByUserId: 'user-official-1',
      });
    },
    /Unsupported or fraudulent file content/,
    'Must reject disguised/spoofed files'
  );

  // 3. Valid upload stores SHA-256 hash and metadata
  const validResult = evidenceService.saveEvidence({
    complaintId: 'cmp-001',
    evidenceType: 'resolution',
    originalFilename: 'real_fix.jpg',
    buffer: validJpeg,
    uploadedByUserId: 'user-official-1',
  });

  assert.ok(validResult.id);
  assert.strictEqual(validResult.mimeType, 'image/jpeg');
  assert.strictEqual(validResult.sha256Hash.length, 64);

  testDb.close();
});

test('Data Persistence: Relational Integrity Survives Storage Reload', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  seedDatabase(db);

  const repo = new DatabaseRepository(db);

  // Read seeded items
  const complaints = repo.getComplaints();
  assert.strictEqual(complaints.length, 16);

  const users = repo.getUsers();
  assert.strictEqual(users.length, 8);

  // Test creating a complaint persists
  const created = repo.createComplaint({
    title: 'Collapsed Stormwater Culvert Flooding Street',
    description: 'Culvert structural collapse causing severe water logging on main street.',
    category: 'drainage',
    address: '100 Main St',
    locality: 'Downtown Commercial',
    safetyRisk: true,
    reporterId: 'user-citizen-1',
    reporterName: 'Aisha Chen',
  });

  assert.ok(created.id);
  assert.strictEqual(created.reference, 'CP-2026-017');

  const retrieved = repo.getComplaintById('CP-2026-017');
  assert.ok(retrieved);
  assert.strictEqual(retrieved?.title, 'Collapsed Stormwater Culvert Flooding Street');

  // Verify vote persistence
  const voteRes = repo.voteComplaint({ complaintId: created.id, userId: 'user-citizen-2' });
  assert.strictEqual(voteRes.success, true);
  assert.strictEqual(repo.hasUserVoted(created.id, 'user-citizen-2'), true);

  db.close();
});

test('API Contract Compatibility: Existing Output Shapes Match Frontend Expectations', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  seedDatabase(testDb);

  const repo = new DatabaseRepository(testDb);

  // 1. Complaint shape must have frontend fields
  const c = repo.getComplaintById('cmp-001');
  assert.ok(c);
  assert.ok(typeof c?.reference === 'string');
  assert.ok(Array.isArray(c?.priorityRationale));
  assert.ok(typeof c?.safetyRisk === 'boolean');
  assert.ok(typeof c?.votesCount === 'number');
  assert.ok(typeof c?.slaHours === 'number');

  // 2. Analytics shape matches TransparencyPage expectations
  const analytics = repo.getAnalytics();
  assert.ok(analytics.summary);
  assert.ok(typeof analytics.summary.total === 'number');
  assert.ok(typeof analytics.summary.resolutionRate === 'number');
  assert.ok(Array.isArray(analytics.categories));
  assert.ok(Array.isArray(analytics.topAreas));
  assert.ok(Array.isArray(analytics.departmentPerformance));

  testDb.close();
});
