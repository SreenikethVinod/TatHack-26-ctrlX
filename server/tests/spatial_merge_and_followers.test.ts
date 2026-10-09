import test from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrator.ts';
import { seedDatabase } from '../db/seed.ts';
import { DatabaseRepository } from '../db.ts';
import { haversineDistanceMeters } from '../services/duplicateService.ts';
import { NotificationService } from '../services/notificationService.ts';
import { LifecycleService } from '../services/lifecycleService.ts';

test('Spatial Deduplication: 2 Citizens Posting ~50m Apart Across Road Auto-Merge', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  seedDatabase(db);

  const notifService = new NotificationService(db);
  const repo = new DatabaseRepository(db);

  // Geographic coordinates ~50 meters apart across the road
  // 12.971600, 77.594600 vs 12.971950, 77.594900
  const lat1 = 12.971600;
  const lon1 = 77.594600;
  const lat2 = 12.971950;
  const lon2 = 77.594900;
  const dist = haversineDistanceMeters(lat1, lon1, lat2, lon2);

  // Verify distance is approximately 50m (between 45m and 60m)
  assert.ok(dist >= 40 && dist <= 65, `Expected ~50m apart, got ${dist}m`);

  // Citizen 1 reports pothole on the north side of the road
  const c1 = repo.createComplaint({
    title: 'Severe Pothole on North Boulevard Curbside',
    description: 'Deep road crater damaging tires near the north bus stop.',
    category: 'road_damage',
    address: '102 North Boulevard, Ward 4',
    locality: 'Downtown Metro',
    latitude: lat1,
    longitude: lon1,
    safetyRisk: true,
    reporterId: 'user-citizen-1',
    reporterName: 'Aisha Chen',
  });

  assert.ok(c1.id);
  assert.strictEqual(c1.status, 'Submitted');

  // Citizen 2 reports the same problem from the other side of the road (~50m away)
  const c2 = repo.createComplaint({
    title: 'Damaged Asphalt & Pothole across Boulevard',
    description: 'Hazardous asphalt depression right opposite the bus shelter.',
    category: 'road_damage',
    address: '105 South Boulevard, Ward 4',
    locality: 'Downtown Metro',
    latitude: lat2,
    longitude: lon2,
    safetyRisk: false,
    reporterId: 'user-citizen-2',
    reporterName: 'Maya Lin',
  });

  // Verify Citizen 2 report was automatically merged with Citizen 1 report!
  assert.ok(c2.id);
  assert.strictEqual(c2.isMerged, true, 'Second complaint must be marked as merged');
  assert.strictEqual(c2.mergedWithReference, c1.reference, 'Child complaint must point to canonical ticket reference');

  // Verify both complaints share the same maintenance issue
  const updatedC1 = repo.getComplaintById(c1.id)!;
  const updatedC2 = repo.getComplaintById(c2.id)!;
  assert.ok(updatedC1.maintenanceIssueId, 'Canonical ticket must have a maintenance issue cluster');
  assert.strictEqual(
    updatedC1.maintenanceIssueId,
    updatedC2.maintenanceIssueId,
    'Both complaints must be unified under the same maintenance issue cluster'
  );

  // Verify community corroboration score and votes were boosted on canonical ticket
  assert.ok(updatedC1.votesCount >= 2, 'Canonical ticket votes count must be elevated by corroborating report');
  assert.ok(updatedC1.mergedCount && updatedC1.mergedCount >= 1, 'Canonical ticket must reflect merged child count');

  // Verify both citizens are now registered as followers of the report
  assert.strictEqual(notifService.isUserFollowing(c1.id, 'user-citizen-1'), true);
  assert.strictEqual(notifService.isUserFollowing(c1.id, 'user-citizen-2'), true);

  // Verify auto-merge notifications were sent to both citizens
  const notifsCitizen1 = notifService.getNotificationsForUser('user-citizen-1');
  const notifsCitizen2 = notifService.getNotificationsForUser('user-citizen-2');

  assert.ok(
    notifsCitizen1.notifications.some((n) => n.complaintId === c1.id),
    'Citizen 1 must receive community corroboration notification'
  );
  assert.ok(
    notifsCitizen2.notifications.some((n) => n.complaintReference === c1.reference || n.complaintId === c2.id),
    'Citizen 2 must receive spatial auto-merge notification'
  );

  db.close();
});

test('Follow This Report: Toggle Subscriptions & Broadcast Updates', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  seedDatabase(db);

  const notifService = new NotificationService(db);
  const repo = new DatabaseRepository(db);

  // Fetch an existing complaint
  const complaint = repo.getComplaintById('cmp-001')!;
  assert.ok(complaint);

  // Third party citizen clicks "Follow this report"
  const observerUser = {
    id: 'user-observer-1',
    name: 'Marcus Vance',
    email: 'marcus.vance@neighborhood.org',
  };

  // Initially not following
  assert.strictEqual(notifService.isUserFollowing(complaint.id, observerUser.id), false);

  // Click Follow
  const followRes = notifService.toggleFollow(complaint.id, observerUser);
  assert.strictEqual(followRes.isFollowing, true);
  assert.strictEqual(notifService.isUserFollowing(complaint.id, observerUser.id), true);

  // Notification broadcast when municipal official updates status
  const sentCount = notifService.notifyFollowers({
    complaintId: complaint.id,
    type: 'STATUS_UPDATE',
    title: 'Status: In Progress',
    message: `Work crew dispatched to repair ${complaint.reference}.`,
    excludeUserId: 'user-official-1',
  });

  assert.ok(sentCount >= 1, 'At least 1 notification sent to follower');

  // Verify Marcus Vance received the notification
  const observerNotifs = notifService.getNotificationsForUser(observerUser.id);
  assert.ok(observerNotifs.notifications.length >= 1);
  const received = observerNotifs.notifications[0];
  assert.strictEqual(received.complaintReference, complaint.reference);
  assert.strictEqual(received.title, 'Status: In Progress');
  assert.strictEqual(received.read, false);
  assert.strictEqual(observerNotifs.unreadCount, 1);

  // Mark notification as read
  const marked = notifService.markAsRead(received.id, observerUser.id);
  assert.strictEqual(marked, true);
  const afterRead = notifService.getNotificationsForUser(observerUser.id);
  assert.strictEqual(afterRead.unreadCount, 0);

  // Click Unfollow
  const unfollowRes = notifService.toggleFollow(complaint.id, observerUser);
  assert.strictEqual(unfollowRes.isFollowing, false);
  assert.strictEqual(notifService.isUserFollowing(complaint.id, observerUser.id), false);

  db.close();
});
