import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'civic.sqlite');

export function getDatabase(filePath: string = DB_PATH): Database.Database {
  const db = new Database(filePath);
  // Ensure foreign keys and WAL mode are enabled
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}

export const db: Database.Database = getDatabase();

export default db;
