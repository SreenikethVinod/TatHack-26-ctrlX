-- 002_add_ai_verification.sql
-- Add AI verification and forensics column to complaints table

ALTER TABLE complaints ADD COLUMN ai_verification TEXT;
