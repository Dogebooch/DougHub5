import { getDatabase, setSchemaVersion } from "../db-connection";

export function migrateToV5(): void {
  console.log("[Migration] Starting migration to schema version 5 (Acronyms)...");

  const database = getDatabase();

  database.transaction(() => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS medical_acronyms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          acronym TEXT NOT NULL,
          expansion TEXT NOT NULL,
          category TEXT,
          UNIQUE(acronym, expansion)
        );
        CREATE INDEX IF NOT EXISTS idx_medical_acronyms_lookup ON medical_acronyms(acronym);
      `);
    console.log("[Migration] Created medical_acronyms table and indexes");
    setSchemaVersion(5);
  })();

  console.log("[Migration] Successfully migrated to schema version 5");
}