import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { db } from './connection.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

export function runMigrations(database: Database.Database = db): string[] {
  // Ensure _migrations table exists
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = database.prepare('SELECT id FROM _migrations').all() as { id: string }[];
  const appliedSet = new Set(appliedRows.map((r) => r.id));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];

  for (const file of files) {
    if (!appliedSet.has(file)) {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(fullPath, 'utf8');

      // Execute migration inside a transaction
      const applyMigration = database.transaction(() => {
        database.exec(sql);
        database
          .prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)')
          .run(file, new Date().toISOString());
      });

      applyMigration();
      newlyApplied.push(file);
      console.log(`[Database Migrator] Successfully applied migration: ${file}`);
    }
  }

  return newlyApplied;
}

if (process.argv[1] && process.argv[1].endsWith('migrator.ts')) {
  console.log('[Database Migrator] Running migrations...');
  const applied = runMigrations();
  console.log(`[Database Migrator] Done. ${applied.length} migration(s) applied.`);
}
