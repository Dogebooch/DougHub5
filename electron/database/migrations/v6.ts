import { getDatabase, setSchemaVersion, columnExists } from "../db-connection";

export function migrateToV6(): void {
  console.log("[Migration] Starting migration to schema version 6 (Settings)...");

  const database = getDatabase();

  database.transaction(() => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);

    if (!columnExists("settings", "updatedAt")) {
      database.exec("ALTER TABLE settings ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''");
    }

    const now = new Date().toISOString();
    const stmt = database.prepare(`
        INSERT OR IGNORE INTO settings (key, value, updatedAt) 
        VALUES (?, ?, ?)
      `);

    stmt.run("review_count", "0", now);
    stmt.run("fsrs_parameters", "{}", now);
    stmt.run("last_optimization_date", "null", now);

    console.log("[Migration] Created settings table and seeded defaults");
    setSchemaVersion(6);
  })();

  console.log("[Migration] Successfully migrated to schema version 6");
}