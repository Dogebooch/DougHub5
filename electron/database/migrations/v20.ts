import { getDatabase, setSchemaVersion } from "../db-connection";

export function migrateToV20(): void {
  console.log("[Migration] Starting migration to schema version 20 (Callout Types)...");
  const database = getDatabase();

  database.transaction(() => {
    // Add calloutType column to notebook_blocks
    // Values: 'pearl' | 'trap' | 'caution' | null
    database.exec(`
      ALTER TABLE notebook_blocks ADD COLUMN calloutType TEXT
    `);
    console.log("[Migration] Added calloutType column to notebook_blocks");

    setSchemaVersion(20);
  })();

  console.log("[Migration] Successfully migrated to version 20");
}
