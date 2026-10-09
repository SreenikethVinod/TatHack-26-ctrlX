import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { db } from './connection.ts';
import { runMigrations } from './migrator.ts';
import { hashPassword } from '../services/authService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const INITIAL_USERS_DATA = [
  {
    id: 'user-citizen-1',
    name: 'Citizen Aisha Chen',
    email: 'citizen@civicpulse.org',
    role: 'CITIZEN',
    department: null,
    locality: 'Central Metro',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-citizen-2',
    name: 'Citizen Maya Lin',
    email: 'citizen2@civicpulse.org',
    role: 'CITIZEN',
    department: null,
    locality: 'Oakwood Heights',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-official-1',
    name: 'Director Marcus Vance',
    email: 'municipality@civicpulse.org',
    role: 'PANCHAYAT_OFFICER',
    department: 'Public Works & Roads',
    locality: 'Central Municipal Ward',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-official-2',
    name: 'Supervisor Sarah Jenkins',
    email: 'sarah@gov.demo',
    role: 'SUPERVISOR',
    department: 'Sanitation & Waste Management',
    locality: 'Central Ward 2',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-official-3',
    name: 'Officer David Kim',
    email: 'david@gov.demo',
    role: 'SUPERVISOR',
    department: 'Water Supply & Sanitation Board',
    locality: 'East Metro',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'user-district-1',
    name: 'District Admin Dr. Elena Rostova',
    email: 'district@civicpulse.org',
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

export const INITIAL_COMPLAINTS_DATA = [
  {
    id: 'cmp-001',
    reference: 'CP-2026-001',
    title: 'Deep Pothole in Crosswalk',
    description: 'Hazardous road pothole posing vehicular damage risk.',
    category: 'road_damage',
    address: '742 4th Ave',
    locality: 'Oakwood North',
    latitude: 37.7749,
    longitude: -122.4194,
    status: 'In Progress',
    priority: 'High',
    system_recommended_priority: 'High',
    priority_rationale: '["Severe vehicle damage risk", "Active pedestrian crossing"]',
    priority_score: 78,
    safety_risk: 1,
    assigned_department: 'Public Works & Roads',
    reporter_id: 'user-citizen-1',
    reporter_name: 'Aisha Chen',
    sla_hours: 48,
    days_ago: 3,
    acknowledged_days_ago: 2,
    acknowledged_by: 'user-official-1',
    acknowledged_by_name: 'Director Marcus Vance',
    assigned_worker: 'Road Repair Crew Alpha',
    budget: 2500,
  },
  {
    id: 'cmp-002',
    reference: 'CP-2026-002',
    title: 'Main Pipeline Valve Leakage',
    description: 'Clean water leaking from underground valve chamber.',
    category: 'water_supply',
    address: '120 Commercial Blvd',
    locality: 'Downtown Commercial',
    latitude: 37.7833,
    longitude: -122.4167,
    status: 'Acknowledged',
    priority: 'Medium',
    system_recommended_priority: 'Medium',
    priority_rationale: '["Water resource loss", "Pavement saturation"]',
    priority_score: 55,
    safety_risk: 0,
    assigned_department: 'Water Supply & Sanitation Board',
    reporter_id: 'user-citizen-1',
    reporter_name: 'Aisha Chen',
    sla_hours: 72,
    days_ago: 2,
    acknowledged_days_ago: 1,
    acknowledged_by: 'user-official-3',
    acknowledged_by_name: 'Officer David Kim',
  },
  {
    id: 'cmp-003',
    reference: 'CP-2026-003',
    title: 'Blocked Stormwater Drain Grate',
    description: 'Heavy leaf debris and sediment blocking stormwater drain.',
    category: 'drainage',
    address: '45 Riverside Dr',
    locality: 'Riverdale South',
    latitude: 37.7650,
    longitude: -122.4200,
    status: 'In Progress',
    priority: 'High',
    system_recommended_priority: 'High',
    priority_rationale: '["Localized pooling", "Storm surge vulnerability"]',
    priority_score: 72,
    safety_risk: 1,
    assigned_department: 'Drainage & Flood Control',
    reporter_id: 'user-citizen-2',
    reporter_name: 'Maya Lin',
    sla_hours: 48,
    days_ago: 4,
    acknowledged_days_ago: 3,
    acknowledged_by: 'user-official-1',
    acknowledged_by_name: 'Director Marcus Vance',
    assigned_worker: 'Storm Drain Squad Beta',
    budget: 1800,
  },
  {
    id: 'cmp-004',
    reference: 'CP-2026-004',
    title: 'Massive hazardous road pothole dangerous for cars',
    description: 'Deep hazardous pothole in road lane near intersection.',
    category: 'road_damage',
    address: '748 4th Ave',
    locality: 'Oakwood North',
    latitude: 37.7751,
    longitude: -122.4192,
    status: 'Submitted',
    priority: 'High',
    system_recommended_priority: 'High',
    priority_rationale: '["Proximity to school", "Repeated vehicle impact"]',
    priority_score: 76,
    safety_risk: 1,
    assigned_department: 'Public Works & Roads',
    reporter_id: 'user-citizen-2',
    reporter_name: 'Maya Lin',
    sla_hours: 48,
    days_ago: 1,
  },
  {
    id: 'cmp-005',
    reference: 'CP-2026-005',
    title: 'Flickering Streetlight Cluster',
    description: 'Dark street section due to broken overhead lamps.',
    category: 'streetlights',
    address: '310 Sunset Blvd',
    locality: 'Sunset Park',
    latitude: 37.7600,
    longitude: -122.4350,
    status: 'Submitted',
    priority: 'Low',
    system_recommended_priority: 'Low',
    priority_rationale: '["Minor visibility impact", "Residential lane"]',
    priority_score: 38,
    safety_risk: 0,
    assigned_department: 'Electrical & Street Lighting',
    reporter_id: 'user-citizen-1',
    reporter_name: 'Aisha Chen',
    sla_hours: 120,
    days_ago: 1,
  },
  {
    id: 'cmp-006',
    reference: 'CP-2026-006',
    title: 'Overflowing Community Trash Bins',
    description: 'Solid waste accumulation spilling onto walking area.',
    category: 'waste_management',
    address: '500 Market St',
    locality: 'Market Square',
    latitude: 37.7900,
    longitude: -122.4000,
    status: 'Submitted',
    priority: 'Medium',
    system_recommended_priority: 'Medium',
    priority_rationale: '["Sanitation spill", "Commercial foot traffic"]',
    priority_score: 50,
    safety_risk: 0,
    assigned_department: 'Sanitation & Waste Management',
    reporter_id: 'user-citizen-2',
    reporter_name: 'Maya Lin',
    sla_hours: 72,
    days_ago: 1,
  },
  {
    id: 'cmp-007',
    reference: 'CP-2026-007',
    title: 'Damaged Pedestrian Guardrail',
    description: 'Bent metal rail near bus terminal safely replaced.',
    category: 'public_safety',
    address: '100 Civic Center Plaza',
    locality: 'Civic Center',
    latitude: 37.7790,
    longitude: -122.4180,
    status: 'Resolved',
    priority: 'Critical',
    system_recommended_priority: 'Critical',
    priority_rationale: '["High pedestrian transit hazard", "Traffic barrier compromise"]',
    priority_score: 90,
    safety_risk: 1,
    assigned_department: 'Public Safety & Urban Infrastructure',
    reporter_id: 'user-citizen-1',
    reporter_name: 'Aisha Chen',
    sla_hours: 24,
    days_ago: 3,
    acknowledged_days_ago: 2,
    resolved_days_ago: 1,
    resolution_summary: 'Guardrail welded and reinforced with high-visibility reflector.',
  },
  {
    id: 'cmp-008',
    reference: 'CP-2026-008',
    title: 'Sunken Asphalt Trench',
    description: 'Asphalt depression causing vehicle bottoming out.',
    category: 'road_damage',
    address: '820 Highland Ave',
    locality: 'Highland Park',
    latitude: 37.7700,
    longitude: -122.4100,
    status: 'In Progress',
    priority: 'High',
    system_recommended_priority: 'High',
    priority_rationale: '["Structural asphalt settlement", "Arterial speed zone"]',
    priority_score: 75,
    safety_risk: 1,
    assigned_department: 'Public Works & Roads',
    reporter_id: 'user-citizen-2',
    reporter_name: 'Maya Lin',
    sla_hours: 48,
    days_ago: 3,
    acknowledged_days_ago: 2,
    acknowledged_by: 'user-official-1',
    acknowledged_by_name: 'Director Marcus Vance',
    assigned_worker: 'Road Resurfacing Unit',
    budget: 3100,
  },
  {
    id: 'cmp-009',
    reference: 'CP-2026-009',
    title: 'Burst Water Main at School Junction',
    description: 'Large volumes of potable water flooding the roadway outside elementary school.',
    category: 'water_supply',
    address: '350 School Lane',
    locality: 'Oakwood North',
    latitude: 37.7780,
    longitude: -122.4210,
    status: 'In Progress',
    priority: 'Critical',
    system_recommended_priority: 'Critical',
    priority_rationale: '["School zone flooding", "Severe water loss"]',
    priority_score: 92,
    safety_risk: 1,
    assigned_department: 'Water Supply & Sanitation Board',
    reporter_id: 'user-citizen-1',
    reporter_name: 'Aisha Chen',
    sla_hours: 24,
    days_ago: 2,
    acknowledged_days_ago: 1,
    assigned_worker: 'Rapid Pipeline Crew 4',
    budget: 4200,
  },
  {
    id: 'cmp-010',
    reference: 'CP-2026-010',
    title: 'Missing Manhole Cover in Alley',
    description: 'Uncovered opening on pedestrian footpath creating lethal fall risk.',
    category: 'public_safety',
    address: '12 Alleyway 9',
    locality: 'Central Metro',
    latitude: 37.7720,
    longitude: -122.4150,
    status: 'Scheduled',
    priority: 'Critical',
    system_recommended_priority: 'Critical',
    priority_rationale: '["Lethal fall hazard", "Nighttime unlit path"]',
    priority_score: 95,
    safety_risk: 1,
    assigned_department: 'Public Safety & Urban Infrastructure',
    reporter_id: 'user-citizen-2',
    reporter_name: 'Maya Lin',
    sla_hours: 24,
    days_ago: 2,
    acknowledged_days_ago: 1,
    assigned_worker: 'Safety Rapid Response',
    budget: 900,
  },
  {
    id: 'cmp-011',
    reference: 'CP-2026-011',
    title: 'Collapsed Culvert Embankment',
    description: 'Culvert slope failure eroding road shoulder.',
    category: 'drainage',
    address: '88 Valley Way',
    locality: 'Riverdale South',
    latitude: 37.7630,
    longitude: -122.4220,
    status: 'Approved/prioritised',
    priority: 'Medium',
    system_recommended_priority: 'Medium',
    priority_rationale: '["Embankment erosion", "Secondary road connection"]',
    priority_score: 60,
    safety_risk: 0,
    assigned_department: 'Drainage & Flood Control',
    reporter_id: 'user-citizen-1',
    reporter_name: 'Aisha Chen',
    sla_hours: 72,
    days_ago: 4,
    acknowledged_days_ago: 3,
  },
  {
    id: 'cmp-012',
    reference: 'CP-2026-012',
    title: 'Exposed Wire at Base of Lamppost',
    description: 'Access panel detached exposing live municipal wiring.',
    category: 'streetlights',
    address: '244 Pine St',
    locality: 'Downtown Commercial',
    latitude: 37.7850,
    longitude: -122.4130,
    status: 'Acknowledged',
    priority: 'High',
    system_recommended_priority: 'High',
    priority_rationale: '["Live electrical hazard", "Public pedestrian thoroughfare"]',
    priority_score: 84,
    safety_risk: 1,
    assigned_department: 'Electrical & Street Lighting',
    reporter_id: 'user-citizen-2',
    reporter_name: 'Maya Lin',
    sla_hours: 48,
    days_ago: 2,
    acknowledged_days_ago: 1,
  },
  {
    id: 'cmp-013',
    reference: 'CP-2026-013',
    title: 'Illegal Industrial Debris Dumping',
    description: 'Piles of demolition masonry blocking access lane.',
    category: 'waste_management',
    address: '70 Industrial Park Rd',
    locality: 'East Metro',
    latitude: 37.7550,
    longitude: -122.3950,
    status: 'Stalled',
    priority: 'Medium',
    system_recommended_priority: 'Medium',
    priority_rationale: '["Access lane obstruction", "Commercial zone"]',
    priority_score: 58,
    safety_risk: 0,
    assigned_department: 'Sanitation & Waste Management',
    reporter_id: 'user-citizen-1',
    reporter_name: 'Aisha Chen',
    sla_hours: 72,
    days_ago: 6,
    acknowledged_days_ago: 5,
    inactivity_cycle: 1,
  },
  {
    id: 'cmp-014',
    reference: 'CP-2026-014',
    title: 'Arterial Bridge Expansion Joint Separation',
    description: 'Vehicular traffic bouncing heavily across damaged bridge deck joint.',
    category: 'road_damage',
    address: 'Metro River Bridge Span 3',
    locality: 'Central Metro',
    latitude: 37.7800,
    longitude: -122.4080,
    status: 'Escalated to District Admin',
    priority: 'Critical',
    system_recommended_priority: 'Critical',
    priority_rationale: '["Major arterial route", "Structural bridge deck risk"]',
    priority_score: 91,
    safety_risk: 1,
    assigned_department: 'Public Works & Roads',
    reporter_id: 'user-citizen-2',
    reporter_name: 'Maya Lin',
    sla_hours: 24,
    days_ago: 16,
    is_escalated_district: 1,
  },
  {
    id: 'cmp-015',
    reference: 'CP-2026-015',
    title: 'Low Pressure and Turbid Tap Water',
    description: 'Brown water from distribution line affecting residential block.',
    category: 'water_supply',
    address: '410 Oakwood Heights',
    locality: 'Oakwood Heights',
    latitude: 37.7680,
    longitude: -122.4300,
    status: 'Submitted',
    priority: 'Medium',
    system_recommended_priority: 'Medium',
    priority_rationale: '["Potable supply turbidity", "Multi-household impact"]',
    priority_score: 52,
    safety_risk: 0,
    assigned_department: 'Water Supply & Sanitation Board',
    reporter_id: 'user-citizen-1',
    reporter_name: 'Aisha Chen',
    sla_hours: 72,
    days_ago: 2,
  },
  {
    id: 'cmp-016',
    reference: 'CP-2026-016',
    title: 'Downed Tree Branch Obstructing Sidewalk',
    description: 'Large branch cleared by forestry team and chipped.',
    category: 'public_safety',
    address: '95 Parkview Terrace',
    locality: 'Sunset Park',
    latitude: 37.7620,
    longitude: -122.4380,
    status: 'Closed',
    priority: 'Low',
    system_recommended_priority: 'Low',
    priority_rationale: '["Sidewalk clearance", "Minor obstruction"]',
    priority_score: 35,
    safety_risk: 0,
    assigned_department: 'Public Safety & Urban Infrastructure',
    reporter_id: 'user-citizen-2',
    reporter_name: 'Maya Lin',
    sla_hours: 120,
    days_ago: 5,
    resolved_days_ago: 4,
    resolution_summary: 'Branch removed and sidewalk cleared.',
  },
];

export function ensureSystemConfig(database: Database.Database = db) {
  runMigrations(database);
  const now = new Date().toISOString();

  const deptCount = database.prepare('SELECT count(*) as count FROM departments').get() as { count: number };
  if (deptCount.count === 0) {
    const insertDept = database.prepare(`
      INSERT OR IGNORE INTO departments (id, name, contact_email)
      VALUES (?, ?, ?)
    `);
    for (const d of DEPARTMENTS_DATA) {
      insertDept.run(d.id, d.name, d.email);
    }
  }

  const slaCount = database.prepare('SELECT count(*) as count FROM sla_policies').get() as { count: number };
  if (slaCount.count === 0) {
    const insertSla = database.prepare(`
      INSERT OR IGNORE INTO sla_policies (id, category, priority, ack_deadline_hours, action_deadline_hours, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of SLA_POLICIES_DATA) {
      const id = `sla-${p.category}-${p.priority}`;
      insertSla.run(id, p.category, p.priority, p.ack, p.action, now, now);
    }
  }
}

export function wipeDatabase(database: Database.Database = db) {
  runMigrations(database);
  const transaction = database.transaction(() => {
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
      DELETE FROM complaint_followers;
      DELETE FROM notifications;
      DELETE FROM complaints;
      DELETE FROM maintenance_issues;
      DELETE FROM users;
      DELETE FROM sla_policies;
      DELETE FROM departments;
    `);

    // Only configure static municipal departments and SLA metrics
    const insertDept = database.prepare(`
      INSERT INTO departments (id, name, contact_email)
      VALUES (?, ?, ?)
    `);
    for (const d of DEPARTMENTS_DATA) {
      insertDept.run(d.id, d.name, d.email);
    }

    const insertSla = database.prepare(`
      INSERT INTO sla_policies (id, category, priority, ack_deadline_hours, action_deadline_hours, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const p of SLA_POLICIES_DATA) {
      const id = `sla-${p.category}-${p.priority}`;
      insertSla.run(id, p.category, p.priority, p.ack, p.action, now, now);
    }
  });

  transaction();
  console.log('[Database] Database completely wiped. 0 complaints and 0 users.');
}

export function seedDatabase(database: Database.Database = db) {
  runMigrations(database);

  const defaultPasswordHash = hashPassword('DemoPass123!');
  const now = new Date().toISOString();

  const transaction = database.transaction(() => {
    // Clear all existing data safely
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

    // 1. Seed Users (8 users for tests & role personas)
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

    // 4. Seed Complaints
    const insertComplaint = database.prepare(`
      INSERT INTO complaints (
        id, reference, title, description, category, address, locality, latitude, longitude,
        status, priority, system_recommended_priority, priority_rationale, priority_score,
        safety_risk, assigned_department, reporter_id, reporter_name, created_at, updated_at,
        resolved_at, resolution_summary, votes_count, sla_hours, ack_deadline, acknowledged_at,
        acknowledged_by, acknowledged_by_name, assigned_worker, budget, is_escalated_district,
        inactivity_cycle, next_action_deadline
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    const insertHistory = database.prepare(`
      INSERT INTO complaint_history (
        id, complaint_id, previous_status, new_status, event_type,
        actor_id, actor_name, actor_role, public_update, deadline_info, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVote = database.prepare(`
      INSERT INTO votes (id, complaint_id, user_id, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    for (const c of INITIAL_COMPLAINTS_DATA) {
      const createdDate = new Date(Date.now() - c.days_ago * 24 * 60 * 60 * 1000).toISOString();
      const ackDeadline = new Date(new Date(createdDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const nextActionDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const ackDate = c.acknowledged_days_ago ? new Date(Date.now() - c.acknowledged_days_ago * 24 * 60 * 60 * 1000).toISOString() : null;
      const resDate = c.resolved_days_ago ? new Date(Date.now() - c.resolved_days_ago * 24 * 60 * 60 * 1000).toISOString() : null;

      insertComplaint.run(
        c.id,
        c.reference,
        c.title,
        c.description,
        c.category,
        c.address,
        c.locality,
        c.latitude,
        c.longitude,
        c.status,
        c.priority,
        c.system_recommended_priority,
        c.priority_rationale,
        c.priority_score,
        c.safety_risk,
        c.assigned_department,
        c.reporter_id,
        c.reporter_name,
        createdDate,
        resDate || ackDate || createdDate,
        resDate,
        c.resolution_summary || null,
        1,
        c.sla_hours,
        ackDeadline,
        ackDate,
        c.acknowledged_by || null,
        c.acknowledged_by_name || null,
        c.assigned_worker || null,
        c.budget || 0,
        c.is_escalated_district || 0,
        c.inactivity_cycle || 0,
        nextActionDeadline
      );

      // Initial history
      insertHistory.run(
        `hist-${c.id}-init`,
        c.id,
        'None',
        'Submitted',
        'SUBMITTED',
        c.reporter_id,
        c.reporter_name,
        'Citizen',
        'Complaint registered into CivicPulse municipal queue.',
        `Acknowledgement Deadline: ${ackDeadline}`,
        createdDate
      );

      if (ackDate) {
        insertHistory.run(
          `hist-${c.id}-ack`,
          c.id,
          'Submitted',
          'Acknowledged',
          'ACKNOWLEDGED',
          c.acknowledged_by || 'user-official-1',
          c.acknowledged_by_name || 'Municipal Official',
          'Municipality Admin',
          'Report reviewed and formally acknowledged. Field triage initiated.',
          null,
          ackDate
        );
      }

      if (c.status === 'In Progress' && c.assigned_worker) {
        insertHistory.run(
          `hist-${c.id}-prog`,
          c.id,
          'Acknowledged',
          'In Progress',
          'WORKER_ASSIGNED',
          c.acknowledged_by || 'user-official-1',
          c.acknowledged_by_name || 'Municipal Official',
          'Municipality Admin',
          `Dispatched to ${c.assigned_worker} with allocated budget $${c.budget}.`,
          null,
          ackDate || createdDate
        );
      }

      if (resDate) {
        insertHistory.run(
          `hist-${c.id}-res`,
          c.id,
          'In Progress',
          c.status,
          'RESOLVED',
          'user-official-1',
          'Director Marcus Vance',
          'Municipality Admin',
          c.resolution_summary || 'Repairs completed and verified on site.',
          null,
          resDate
        );
      }

      // Initial vote by reporter
      insertVote.run(`vote-${c.id}-init`, c.id, c.reporter_id, createdDate);
    }
  });

  transaction();
  console.log(`[Database Seed] Database initialized: 8 Users and 16 Complaints configured.`);
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  console.log('[Database Seed] Starting database initialization...');
  seedDatabase();
  console.log('[Database Seed] Done.');
}
