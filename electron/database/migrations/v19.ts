import { getDatabase, setSchemaVersion } from "../db-connection";

export function migrateToV19(): void {
  console.log("[Migration] Starting migration to schema version 19 (Dev Settings)...");
  const database = getDatabase();

  database.transaction(() => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS dev_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updatedAt TEXT
      )
    `);
    console.log("[Migration] Created dev_settings table");

    setSchemaVersion(19);
  })();
  console.log("[Migration] Successfully migrated to version 19");
}
