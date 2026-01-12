import { createBackup, restoreBackup } from "../../backup-service";
import {
  closeDatabase,
  getDatabase,
  reopenConnection,
  setSchemaVersion,
  tableExists,
} from "../db-connection";

export function migrateToV11(dbPath: string): void {
  console.log(
    "[Migration] Starting migration to schema version 11 (Source raw pages)..."
  );

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      if (!tableExists("source_raw_pages")) {
        database.exec(`
          CREATE TABLE source_raw_pages (
            sourceItemId TEXT PRIMARY KEY,
            htmlPayload TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (sourceItemId) REFERENCES source_items(id) ON DELETE CASCADE
          )
        `);
        console.log("[Migration] Created source_raw_pages table");
      }

      setSchemaVersion(11);
    })();

    console.log("[Migration] Successfully migrated to schema version 11");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    closeDatabase();
    restoreBackup(backupPath, dbPath);
    reopenConnection(dbPath);
    throw error;
  }
}
