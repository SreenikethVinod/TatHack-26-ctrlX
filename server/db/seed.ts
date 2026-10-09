import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { db } from './connection.ts';
import { runMigrations } from './migrator.ts';
import { hashPassword } from '../services/authService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const INITIAL_USERS_DATA = [
  // 1a. Citizen User 1
  {
    id: 'user-citizen-primary',
    name: 'Citizen Alex Morgan',
    email: 'citizen@civicpulse.org',
    role: 'CITIZEN',
    department: null,
    locality: 'Central Metro',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  // 1b. Citizen User 2 (For testing endorsements and upvotes)
  {
    id: 'user-citizen-secondary',
    name: 'Citizen Maya Lin',
    email: 'citizen2@civicpulse.org',
    role: 'CITIZEN',
    department: null,
    locality: 'Oakwood Heights',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
  },
  // 2. Municipality Admin
  {
    id: 'user-muni-primary',
    name: 'Municipality Admin (Urban Works)',
    email: 'municipality@civicpulse.org',
    role: 'SUPERVISOR',
    department: 'Public Works & Roads',
    locality: 'Central Municipal Ward',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  },
  // 3. District Admin (Higher Authority)
  {
    id: 'user-district-primary',
    name: 'District Admin Dr. Elena Rostova',
    email: 'district@civicpulse.org',
    role: 'DISTRICT_REVIEWER',
    department: 'District Headquarters & Oversight',
    locality: 'Metropolitan District HQ',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
  },
  // Compatibility aliases
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
    id: 'user-official-1',
    name: 'Director Marcus Vance',
    email: 'marcus.vance@gov.demo',
    role: 'PANCHAYAT_OFFICER',
    department: 'Public Works & Roads',
    locality: 'Central Metro',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-district-1',
    name: 'Commissioner Elena Rostova',
    email: 'elena.rostova@district.demo',
    role: 'DISTRICT_REVIEWER',
    department: 'District Headquarters & Oversight',
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
    // Clear all existing data safely - remove all demo complaints
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

    // 1. Seed Users (Real authentic accounts for Citizen, Municipality Admin, District Admin)
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

    // Notice: All demo complaints removed! Database starts completely fresh with 0 complaints.
  });

  transaction();
  console.log(`[Database Seed] Database initialized: Users configured. 0 demo complaints (clean live database).`);
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  console.log('[Database Seed] Starting database initialization...');
  seedDatabase();
  console.log('[Database Seed] Done.');
}
