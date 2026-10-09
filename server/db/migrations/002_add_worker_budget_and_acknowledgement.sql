-- 002_add_worker_budget_and_acknowledgement.sql
-- Adds columns for worker assignment, budget allocation, acknowledgement tracking, and district escalation actions

ALTER TABLE complaints ADD COLUMN assigned_worker TEXT;
ALTER TABLE complaints ADD COLUMN budget REAL DEFAULT 0;
ALTER TABLE complaints ADD COLUMN budget_notes TEXT;
ALTER TABLE complaints ADD COLUMN acknowledged_by TEXT;
ALTER TABLE complaints ADD COLUMN acknowledged_by_name TEXT;
ALTER TABLE complaints ADD COLUMN assigned_at TEXT;
ALTER TABLE complaints ADD COLUMN assigned_by TEXT;
ALTER TABLE complaints ADD COLUMN assigned_by_name TEXT;
ALTER TABLE complaints ADD COLUMN is_escalated_district INTEGER DEFAULT 0;
ALTER TABLE complaints ADD COLUMN district_action_notes TEXT;
ALTER TABLE complaints ADD COLUMN district_action_at TEXT;
ALTER TABLE complaints ADD COLUMN district_action_by TEXT;
