-- 004_add_photo_metadata_and_verification.sql
-- Columns for live in-app camera photo metadata, cryptographic fingerprint, and geolocation match/flagging

ALTER TABLE complaints ADD COLUMN photo_fingerprint TEXT;
ALTER TABLE complaints ADD COLUMN photo_metadata TEXT;
ALTER TABLE complaints ADD COLUMN is_flagged_location_mismatch INTEGER DEFAULT 0;
ALTER TABLE complaints ADD COLUMN location_match_status TEXT DEFAULT 'NO_PHOTO';
ALTER TABLE complaints ADD COLUMN photo_distance_meters REAL;
