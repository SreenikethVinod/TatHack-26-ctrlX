CREATE TABLE IF NOT EXISTS waste_pickups (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_email TEXT,
  waste_type TEXT NOT NULL,
  estimated_weight TEXT,
  pickup_date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  address TEXT NOT NULL,
  locality TEXT NOT NULL,
  pincode TEXT,
  special_instructions TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'Requested',
  assigned_crew TEXT,
  assigned_vehicle TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_waste_pickups_user ON waste_pickups(user_id);
CREATE INDEX IF NOT EXISTS idx_waste_pickups_status ON waste_pickups(status);
CREATE INDEX IF NOT EXISTS idx_waste_pickups_reference ON waste_pickups(reference);
