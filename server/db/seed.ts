import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { db } from './connection.ts';
import { runMigrations } from './migrator.ts';
import { hashPassword } from '../services/authService.ts';
import { calculatePriorityScore } from '../services/priorityService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_DB_FILE = path.join(DATA_DIR, 'civicpulse_db.json');

export const INITIAL_USERS_DATA = [
  {
    id: 'user-citizen-1',
    name: 'Aisha Chen',
    email: 'aisha.chen@citizen.demo',
    role: 'CITIZEN',
    department: null,
    locality: 'Oakwood North',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-citizen-2',
    name: 'David Patel',
    email: 'david.patel@citizen.demo',
    role: 'CITIZEN',
    department: null,
    locality: 'Downtown Commercial',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-official-1',
    name: 'Director Marcus Vance',
    email: 'marcus.vance@gov.demo',
    role: 'PANCHAYAT_OFFICER',
    department: 'Public Works & Roads',
    locality: 'Central Metro',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-official-2',
    name: 'Inspector Sarah Jenkins',
    email: 'sarah.jenkins@gov.demo',
    role: 'SUPERVISOR',
    department: 'Sanitation & Waste Management',
    locality: 'Westend District',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-official-3',
    name: 'Eng. Roberto Silva',
    email: 'roberto.silva@gov.demo',
    role: 'PANCHAYAT_OFFICER',
    department: 'Water Supply & Sanitation Board',
    locality: 'Highland Park',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-district-1',
    name: 'Commissioner Elena Rostova',
    email: 'elena.rostova@district.demo',
    role: 'DISTRICT_REVIEWER',
    department: 'Public Works & Roads',
    locality: 'Metropolitan District HQ',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-admin-1',
    name: 'Administrator Vikram Sharma',
    email: 'admin@civicpulse.demo',
    role: 'ADMIN',
    department: 'Municipal Administration',
    locality: 'Civic Center',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'system-escalation-worker',
    name: 'System Accountability Engine',
    email: 'system.worker@civicpulse.internal',
    role: 'ADMIN',
    department: 'Municipal Administration',
    locality: 'System HQ',
    avatar_url: null,
  },
];

export const DEPARTMENTS_DATA = [
  { id: 'dept-1', name: 'Public Works & Roads', email: 'roads@metro.gov' },
  { id: 'dept-2', name: 'Sanitation & Waste Management', email: 'sanitation@metro.gov' },
  { id: 'dept-3', name: 'Drainage & Flood Control', email: 'drainage@metro.gov' },
  { id: 'dept-4', name: 'Electrical & Street Lighting', email: 'lighting@metro.gov' },
  { id: 'dept-5', name: 'Water Supply & Sanitation Board', email: 'water@metro.gov' },
  { id: 'dept-6', name: 'Public Safety & Urban Infrastructure', email: 'safety@metro.gov' },
];

export const SLA_POLICIES_DATA = [
  { category: 'public_safety', priority: 'Critical', ack: 4, action: 12 },
  { category: 'public_safety', priority: 'High', ack: 12, action: 24 },
  { category: 'public_safety', priority: 'Medium', ack: 24, action: 48 },
  { category: 'public_safety', priority: 'Low', ack: 48, action: 96 },
  { category: 'water_supply', priority: 'Critical', ack: 6, action: 18 },
  { category: 'water_supply', priority: 'High', ack: 12, action: 36 },
  { category: 'water_supply', priority: 'Medium', ack: 24, action: 72 },
  { category: 'water_supply', priority: 'Low', ack: 48, action: 120 },
  { category: 'road_damage', priority: 'Critical', ack: 12, action: 24 },
  { category: 'road_damage', priority: 'High', ack: 24, action: 48 },
  { category: 'road_damage', priority: 'Medium', ack: 48, action: 72 },
  { category: 'road_damage', priority: 'Low', ack: 72, action: 120 },
  { category: 'drainage', priority: 'Critical', ack: 12, action: 24 },
  { category: 'drainage', priority: 'High', ack: 24, action: 48 },
  { category: 'drainage', priority: 'Medium', ack: 48, action: 72 },
  { category: 'drainage', priority: 'Low', ack: 72, action: 120 },
  { category: 'waste_management', priority: 'Critical', ack: 12, action: 24 },
  { category: 'waste_management', priority: 'High', ack: 24, action: 48 },
  { category: 'waste_management', priority: 'Medium', ack: 48, action: 72 },
  { category: 'waste_management', priority: 'Low', ack: 72, action: 120 },
  { category: 'streetlights', priority: 'Critical', ack: 12, action: 24 },
  { category: 'streetlights', priority: 'High', ack: 24, action: 48 },
  { category: 'streetlights', priority: 'Medium', ack: 48, action: 72 },
  { category: 'streetlights', priority: 'Low', ack: 72, action: 120 },
];

export function seedDatabase(database: Database.Database = db) {
  runMigrations(database);

  const defaultPasswordHash = hashPassword('DemoPass123!');
  const now = new Date().toISOString();

  const transaction = database.transaction(() => {
    // Clear existing data safely
    database.exec(`
      DELETE FROM resolution_verifications;
      DELETE FROM maintenance_plan_items;
      DELETE FROM maintenance_plans;
      DELETE FROM complaint_duplicate_links;
      DELETE FROM escalations;
      DELETE FROM attachments;
      DELETE FROM official_notes;
      DELETE FROM votes;
      DELETE FROM complaint_history;
      DELETE FROM complaints;
      DELETE FROM maintenance_issues;
      DELETE FROM sla_policies;
      DELETE FROM departments;
      DELETE FROM users;
    `);

    // 1. Seed Users
    const insertUser = database.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, department, locality, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of INITIAL_USERS_DATA) {
      insertUser.run(
        u.id,
        u.name,
        u.email,
        defaultPasswordHash,
        u.role,
        u.department,
        u.locality,
        u.avatar_url,
        now
      );
    }

    // 2. Seed Departments
    const insertDept = database.prepare(`
      INSERT INTO departments (id, name, contact_email)
      VALUES (?, ?, ?)
    `);
    for (const d of DEPARTMENTS_DATA) {
      insertDept.run(d.id, d.name, d.email);
    }

    // 3. Seed SLA Policies
    const insertSla = database.prepare(`
      INSERT INTO sla_policies (id, category, priority, ack_deadline_hours, action_deadline_hours, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of SLA_POLICIES_DATA) {
      const id = `sla-${p.category}-${p.priority}`;
      insertSla.run(id, p.category, p.priority, p.ack, p.action, now, now);
    }

    // 4. Load complaints, history, notes, and votes from existing JSON demo DB
    let sourceData: any = null;
    if (fs.existsSync(JSON_DB_FILE)) {
      try {
        sourceData = JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf8'));
      } catch (err) {
        console.error('Error reading JSON DB file:', err);
      }
    }

    const complaints = sourceData?.complaints || [];
    const historyEntries = sourceData?.complaint_history || [];
    const notes = sourceData?.official_notes || [];
    const votes = sourceData?.votes || [];

    // Insert complaints
    const insertComplaint = database.prepare(`
      INSERT INTO complaints (
        id, reference, title, description, category, address, locality, latitude, longitude,
        image_url, after_image_url, status, priority, system_recommended_priority, priority_rationale,
        priority_score, safety_risk, assigned_department, reporter_id, reporter_name, created_at,
        updated_at, resolved_at, resolution_summary, votes_count, sla_hours,
        ack_deadline, acknowledged_at, next_action_deadline, last_action_at, inactivity_cycle
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    for (const c of complaints) {
      // Calculate transparent priority score
      const pScore = calculatePriorityScore({
        category: c.category,
        safetyRisk: Boolean(c.safetyRisk),
        votesCount: c.votesCount || 1,
        createdAt: c.createdAt,
        status: c.status,
        address: c.address,
        locality: c.locality,
      });

      const rationaleStr = JSON.stringify(c.priorityRationale || pScore.rationale);
      const isAcknowledged = c.status !== 'Submitted';
      const createdDate = new Date(c.createdAt);

      // Deadlines
      const ackDeadline = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const ackAt = isAcknowledged ? new Date(createdDate.getTime() + 2 * 60 * 60 * 1000).toISOString() : null;
      const nextActionDeadline = isAcknowledged
        ? new Date(createdDate.getTime() + (c.slaHours || 72) * 60 * 60 * 1000).toISOString()
        : ackDeadline;

      insertComplaint.run(
        c.id,
        c.reference,
        c.title,
        c.description,
        c.category,
        c.address,
        c.locality || 'Central Metro',
        c.latitude ?? null,
        c.longitude ?? null,
        c.imageUrl || null,
        c.afterImageUrl || null,
        c.status,
        c.priority,
        c.systemRecommendedPriority || pScore.recommendedPriority,
        rationaleStr,
        pScore.score,
        c.safetyRisk ? 1 : 0,
        c.assignedDepartment || 'Public Works & Roads',
        c.reporterId || 'user-citizen-1',
        c.reporterName || 'Aisha Chen',
        c.createdAt,
        c.updatedAt || c.createdAt,
        c.resolvedAt || null,
        c.resolutionSummary || null,
        c.votesCount || 1,
        c.slaHours || pScore.slaHours,
        ackDeadline,
        ackAt,
        nextActionDeadline,
        ackAt || c.createdAt,
        0
      );
    }

    // Insert history
    const insertHist = database.prepare(`
      INSERT INTO complaint_history (
        id, complaint_id, previous_status, new_status, event_type, actor_id,
        actor_name, actor_role, public_update, explanation, deadline_info, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const h of historyEntries) {
      insertHist.run(
        h.id,
        h.complaintId,
        h.previousStatus || 'None',
        h.newStatus || 'Submitted',
        h.newStatus === 'Submitted' ? 'SUBMITTED' : 'STATUS_CHANGED',
        h.actorId || 'system',
        h.actorName || 'System',
        h.actorRole || 'System',
        h.publicUpdate || 'Update logged',
        h.explanation || null,
        null,
        h.timestamp
      );
    }

    // Insert notes
    const insertNote = database.prepare(`
      INSERT INTO official_notes (
        id, complaint_id, author_id, author_name, department, note, visibility, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const n of notes) {
      insertNote.run(
        n.id,
        n.complaintId,
        n.authorId || 'user-official-1',
        n.authorName || 'Director Marcus Vance',
        n.department || 'Public Works & Roads',
        n.note,
        n.visibility || 'public',
        n.timestamp
      );
    }

    // Insert votes
    const insertVote = database.prepare(`
      INSERT INTO votes (id, complaint_id, user_id, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    for (const v of votes) {
      try {
        insertVote.run(v.id, v.complaintId, v.userId, v.timestamp);
      } catch {
        // Skip duplicate votes if any
      }
    }

    // 5. Seed Demonstration Maintenance Issues and Duplicate Link
    const issueId1 = 'mi-pothole-4th-ave';
    database.prepare(`
      INSERT INTO maintenance_issues (id, title, category, locality, status, primary_complaint_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      issueId1,
      'Road Surface Deterioration on 4th Ave Corridor',
      'road_damage',
      'Oakwood North',
      'OPEN',
      'cmp-001',
      now,
      now
    );

    database.prepare(`
      UPDATE complaints SET maintenance_issue_id = ? WHERE id = 'cmp-001'
    `).run(issueId1);

    // If CP-2026-004 exists, link as suggested duplicate to CP-2026-001
    const cmp4 = complaints.find((c: any) => c.id === 'cmp-004');
    if (cmp4) {
      database.prepare(`
        INSERT INTO complaint_duplicate_links (
          id, complaint_id, canonical_complaint_id, maintenance_issue_id,
          confidence_score, similarity_reason, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'dup-link-001',
        'cmp-004',
        'cmp-001',
        issueId1,
        0.88,
        'Proximity within 85m on 4th Ave and matching road damage category.',
        'confirmed',
        now
      );
    }

    // 6. Seed a demonstration escalation record
    database.prepare(`
      INSERT INTO escalations (
        id, complaint_id, source_department, escalation_level, triggering_event,
        missed_action_cycle, delay_reasons, responsible_party, escalation_status,
        delivery_state, assigned_district_reviewer_id, review_outcome, follow_up_actions,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `).run(
      'esc-seed-001',
      'cmp-003',
      'Water Supply & Sanitation Board',
      2,
      'Inactivity cycle 2 triggered due to delayed contractor requisition for main pipeline rupture.',
      2,
      'Awaiting specialized replacement 6-inch ductile iron valve parts.',
      'Eng. Roberto Silva',
      'PENDING_REVIEW',
      'created',
      'user-district-1',
      null,
      'Dispatch priority requisition override from District Central Depot.',
      now,
      now
    );
  });

  transaction();
  console.log(`[Database Seed] Seed completed successfully.`);
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  console.log('[Database Seed] Starting seeding process...');
  seedDatabase();
  console.log('[Database Seed] Done.');
}
