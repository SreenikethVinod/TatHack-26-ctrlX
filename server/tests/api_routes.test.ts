import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { apiRouter } from '../routes.ts';
import { db } from '../db.ts';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  return app;
}

// Simple in-process HTTP dispatcher for testing Express endpoints without external ports
async function simulateRequest(
  app: express.Express,
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any; headers: any }> {
  const http = await import('http');
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const port = address.port;

  const url = `http://127.0.0.1:${port}${path}`;
  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const res = await fetch(url, {
    method,
    headers: fetchHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const resBody = await res.json().catch(() => ({}));
  await new Promise<void>((resolve) => server.close(() => resolve()));

  return { status: res.status, body: resBody, headers: res.headers };
}

test('HTTP Routes: Health Check & System Status', async () => {
  const app = createTestApp();
  const res = await simulateRequest(app, 'GET', '/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'healthy');
  assert.ok(res.body.database);
});

test('HTTP Routes: Authentication, Users & Demo Switcher', async () => {
  const app = createTestApp();

  // GET /api/auth/users
  const usersRes = await simulateRequest(app, 'GET', '/api/auth/users');
  assert.strictEqual(usersRes.status, 200);
  assert.ok(Array.isArray(usersRes.body.users));
  assert.ok(usersRes.body.users.length >= 7);

  // GET /api/auth/me with x-demo-user-id header
  const meRes = await simulateRequest(app, 'GET', '/api/auth/me', null, {
    'x-demo-user-id': 'user-official-1',
  });
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.body.user.id, 'user-official-1');
  assert.strictEqual(meRes.body.user.role, 'official');
  assert.strictEqual(meRes.body.user.systemRole, 'PANCHAYAT_OFFICER');

  // Register & Login workflow
  const regEmail = `test_${Date.now()}@citizen.demo`;
  const regRes = await simulateRequest(app, 'POST', '/api/auth/register', {
    name: 'New Citizen',
    email: regEmail,
    password: 'Password123!',
    role: 'CITIZEN',
  });
  assert.strictEqual(regRes.status, 201);
  assert.ok(regRes.body.token);

  const loginRes = await simulateRequest(app, 'POST', '/api/auth/login', {
    email: regEmail,
    password: 'Password123!',
  });
  assert.strictEqual(loginRes.status, 200);
  assert.ok(loginRes.body.token);
});

test('HTTP Routes: Complaint CRUD, Tracking, Votes & Notes', async () => {
  const app = createTestApp();

  // 1. GET /api/complaints
  const listRes = await simulateRequest(app, 'GET', '/api/complaints');
  assert.strictEqual(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body.complaints));
  assert.ok(listRes.body.count > 0);

  // 2. GET /api/complaints/track/:reference
  const trackRes = await simulateRequest(app, 'GET', '/api/complaints/track/CP-2026-001');
  assert.strictEqual(trackRes.status, 200);
  assert.strictEqual(trackRes.body.complaint.reference, 'CP-2026-001');
  assert.ok(Array.isArray(trackRes.body.history));
  assert.ok(Array.isArray(trackRes.body.notes));

  // 3. POST /api/complaints
  const createRes = await simulateRequest(app, 'POST', '/api/complaints', {
    title: 'Severe Water Leak from Distribution Valve',
    description: 'High pressure municipal water pipe rupture leaking continuously onto sidewalk.',
    category: 'water_supply',
    address: '900 Broadway Ave',
    locality: 'Central Metro',
    safetyRisk: true,
  });
  assert.strictEqual(createRes.status, 201);
  assert.ok(createRes.body.complaint.id);
  assert.ok(createRes.body.complaint.reference.startsWith('CP-2026-'));

  const createdId = createRes.body.complaint.id;

  // 4. POST /api/complaints/:id/votes
  const voteRes = await simulateRequest(app, 'POST', `/api/complaints/${createdId}/votes`, null, {
    'x-demo-user-id': 'user-citizen-2',
  });
  assert.strictEqual(voteRes.status, 200);
  assert.strictEqual(voteRes.body.success, true);

  // 5. POST /api/complaints/:id/notes (Official only)
  const noteRes = await simulateRequest(
    app,
    'POST',
    `/api/complaints/${createdId}/notes`,
    { note: 'Dispatched emergency valve repair technician.', visibility: 'public' },
    { 'x-demo-user-id': 'user-official-3' }
  );
  assert.strictEqual(noteRes.status, 201);
  assert.ok(noteRes.body.note.id);

  // 6. PATCH /api/complaints/:id/status
  const statusRes = await simulateRequest(
    app,
    'PATCH',
    `/api/complaints/${createdId}/status`,
    { status: 'Acknowledged', publicUpdate: 'Complaint reviewed by Water Board engineering desk.' },
    { 'x-demo-user-id': 'user-official-3' }
  );
  assert.strictEqual(statusRes.status, 200);
  assert.strictEqual(statusRes.body.complaint.status, 'Acknowledged');

  // 7. Meaningful Action endpoint
  const actionRes = await simulateRequest(
    app,
    'POST',
    `/api/complaints/${createdId}/actions`,
    {
      actionType: 'INSPECTION_COMPLETED',
      description: 'Physical inspection completed. Replacement seal kit scheduled for installation.',
      nextActionDeadlineHours: 24,
    },
    { 'x-demo-user-id': 'user-official-3' }
  );
  assert.strictEqual(actionRes.status, 200);
  assert.strictEqual(actionRes.body.success, true);

  // 8. Timeline endpoint
  const timelineRes = await simulateRequest(app, 'GET', `/api/complaints/${createdId}/timeline`);
  assert.strictEqual(timelineRes.status, 200);
  assert.ok(timelineRes.body.timeline.length >= 2);
});

test('HTTP Routes: Planning, Duplicates & Analytics Endpoints', async () => {
  const app = createTestApp();

  // 1. GET /api/analytics
  const analyticsRes = await simulateRequest(app, 'GET', '/api/analytics');
  assert.strictEqual(analyticsRes.status, 200);
  assert.ok(analyticsRes.body.summary);
  assert.ok(Array.isArray(analyticsRes.body.departmentPerformance));

  // 2. GET /api/analytics/accountability
  const accRes = await simulateRequest(app, 'GET', '/api/analytics/accountability');
  assert.strictEqual(accRes.status, 200);
  assert.ok(typeof accRes.body.totalEscalationsRecorded === 'number');

  // 3. POST /api/planning/generate
  const planRes = await simulateRequest(
    app,
    'POST',
    '/api/planning/generate',
    { budgetLimit: 12000, crewCount: 3, hoursPerCrew: 35 },
    { 'x-demo-user-id': 'user-official-2' }
  );
  assert.strictEqual(planRes.status, 201);
  assert.ok(planRes.body.plan.planId);
  assert.ok(planRes.body.plan.selectedCount > 0);

  // 4. GET /api/complaints/:id/duplicates
  const dupRes = await simulateRequest(app, 'GET', '/api/complaints/cmp-001/duplicates');
  assert.strictEqual(dupRes.status, 200);
  assert.ok(Array.isArray(dupRes.body.duplicates));

  // 5. GET /api/escalations/district-queue (District reviewer only)
  const distRes = await simulateRequest(app, 'GET', '/api/escalations/district-queue', null, {
    'x-demo-user-id': 'user-district-1',
  });
  assert.strictEqual(distRes.status, 200);
  assert.ok(Array.isArray(distRes.body.districtQueue));

  // 6. POST /api/reset-demo-data
  const resetRes = await simulateRequest(app, 'POST', '/api/reset-demo-data');
  assert.strictEqual(resetRes.status, 200);
  assert.strictEqual(resetRes.body.success, true);
  assert.strictEqual(resetRes.body.complaintsCount, 16);
});
