-- 001_initial_schema.sql
-- Civic Relational Schema with Full RBAC, Lifecycle, Escalation, Evidence, Duplicates, and Planning

PRAGMA foreign_keys = ON;

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- Users & Roles
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('CITIZEN', 'PANCHAYAT_OFFICER', 'SUPERVISOR', 'DISTRICT_REVIEWER', 'ADMIN')),
  department TEXT,
  locality TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  contact_email TEXT,
  head_officer_id TEXT REFERENCES users(id)
);

-- Maintenance Issues (canonical group for duplicates and work planning)
CREATE TABLE IF NOT EXISTS maintenance_issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  locality TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  primary_complaint_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  locality TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  image_url TEXT,
  after_image_url TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  system_recommended_priority TEXT NOT NULL,
  priority_rationale TEXT NOT NULL, -- JSON array
  priority_score REAL DEFAULT 0,
  safety_risk INTEGER NOT NULL DEFAULT 0,
  assigned_department TEXT NOT NULL,
  assigned_officer_id TEXT REFERENCES users(id),
  reporter_id TEXT REFERENCES users(id),
  reporter_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  resolution_summary TEXT,
  votes_count INTEGER NOT NULL DEFAULT 1,
  sla_hours INTEGER NOT NULL DEFAULT 72,
  ack_deadline TEXT,
  acknowledged_at TEXT,
  next_action_deadline TEXT,
  last_action_at TEXT,
  last_action_description TEXT,
  inactivity_cycle INTEGER NOT NULL DEFAULT 0,
  is_blocked INTEGER NOT NULL DEFAULT 0,
  blocker_reason TEXT,
  blocker_party TEXT,
  blocker_review_date TEXT,
  is_paused INTEGER NOT NULL DEFAULT 0,
  pause_reason TEXT,
  pause_authorized_by TEXT,
  pause_until TEXT,
  maintenance_issue_id TEXT REFERENCES maintenance_issues(id)
);

-- Complaint History Events (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS complaint_history (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  public_update TEXT NOT NULL,
  explanation TEXT,
  deadline_info TEXT,
  timestamp TEXT NOT NULL
);

-- Attachments and Resolution Evidence
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('initial', 'resolution')),
  original_filename TEXT NOT NULL,
  storage_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256_hash TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  uploaded_at TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'rejected')),
  verified_by TEXT REFERENCES users(id),
  verification_reason TEXT,
  verified_at TEXT
);

-- Official Notes
CREATE TABLE IF NOT EXISTS official_notes (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  author_name TEXT NOT NULL,
  department TEXT NOT NULL,
  note TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK(visibility IN ('internal', 'public')),
  timestamp TEXT NOT NULL
);

-- Votes / Endorsements
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  timestamp TEXT NOT NULL,
  UNIQUE(complaint_id, user_id)
);

-- Duplicate Relationships
CREATE TABLE IF NOT EXISTS complaint_duplicate_links (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  canonical_complaint_id TEXT NOT NULL REFERENCES complaints(id),
  maintenance_issue_id TEXT REFERENCES maintenance_issues(id),
  confidence_score REAL NOT NULL,
  similarity_reason TEXT NOT NULL,
  confirmed_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'suggested' CHECK(status IN ('suggested', 'confirmed', 'rejected')),
  created_at TEXT NOT NULL,
  UNIQUE(complaint_id, canonical_complaint_id)
);

-- Escalations (District-level and Internal)
CREATE TABLE IF NOT EXISTS escalations (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  source_department TEXT NOT NULL,
  escalation_level INTEGER NOT NULL CHECK(escalation_level IN (1, 2, 3)),
  triggering_event TEXT NOT NULL,
  missed_action_cycle INTEGER NOT NULL,
  delay_reasons TEXT,
  responsible_party TEXT,
  escalation_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(escalation_status IN ('PENDING_REVIEW', 'ASSIGNED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RETURNED_TO_PANCHAYAT', 'CLOSED')),
  delivery_state TEXT NOT NULL DEFAULT 'created' CHECK(delivery_state IN ('created', 'dispatched', 'confirmed-delivery')),
  assigned_district_reviewer_id TEXT REFERENCES users(id),
  review_outcome TEXT,
  follow_up_actions TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- SLA & Deadline Policies
CREATE TABLE IF NOT EXISTS sla_policies (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  ack_deadline_hours INTEGER NOT NULL,
  action_deadline_hours INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(category, priority)
);

-- Maintenance Plans
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id TEXT PRIMARY KEY,
  created_by TEXT REFERENCES users(id),
  budget_limit REAL NOT NULL,
  crew_limit INTEGER NOT NULL,
  hours_limit REAL NOT NULL,
  total_cost REAL NOT NULL,
  total_hours_used REAL NOT NULL,
  crew_allocated INTEGER NOT NULL,
  heuristic_used TEXT NOT NULL,
  comparison_fifo_cost REAL NOT NULL,
  comparison_fifo_issues INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- Maintenance Plan Items
CREATE TABLE IF NOT EXISTS maintenance_plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES maintenance_plans(id) ON DELETE CASCADE,
  complaint_id TEXT REFERENCES complaints(id),
  maintenance_issue_id TEXT REFERENCES maintenance_issues(id),
  priority_score REAL NOT NULL,
  estimated_cost REAL NOT NULL,
  estimated_hours REAL NOT NULL,
  assigned_crew TEXT,
  status TEXT NOT NULL CHECK(status IN ('selected', 'deferred')),
  deferral_reason TEXT
);

-- Resolution Verifications
CREATE TABLE IF NOT EXISTS resolution_verifications (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK(status IN ('verified', 'rejected')),
  rejection_reason TEXT,
  notes TEXT,
  verified_at TEXT NOT NULL
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(assigned_department);
CREATE INDEX IF NOT EXISTS idx_complaints_locality ON complaints(locality);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reference ON complaints(reference);
CREATE INDEX IF NOT EXISTS idx_complaints_ack_deadline ON complaints(ack_deadline);
CREATE INDEX IF NOT EXISTS idx_complaints_action_deadline ON complaints(next_action_deadline);
CREATE INDEX IF NOT EXISTS idx_complaint_history_comp ON complaint_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_official_notes_comp ON official_notes(complaint_id);
CREATE INDEX IF NOT EXISTS idx_votes_comp ON votes(complaint_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(escalation_status);
CREATE INDEX IF NOT EXISTS idx_escalations_comp ON escalations(complaint_id);
CREATE INDEX IF NOT EXISTS idx_attachments_comp ON attachments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_attachments_hash ON attachments(sha256_hash);
