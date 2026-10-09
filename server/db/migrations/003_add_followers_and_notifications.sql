-- 003_add_followers_and_notifications.sql
-- Tables for following reports and receiving real-time multi-citizen notifications

CREATE TABLE IF NOT EXISTS complaint_followers (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(complaint_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  complaint_reference TEXT NOT NULL,
  complaint_title TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_complaint_followers_user ON complaint_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
