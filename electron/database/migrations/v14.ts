import { createBackup, restoreBackup } from "../../backup-service";
import {
  closeDatabase,
  getDatabase,
  reopenConnection,
  setSchemaVersion,
  columnExists,
} from "../db-connection";

export function migrateToV14(dbPath: string): void {
  console.log(
    "[Migration] Starting migration to schema version 14 (SourceItem metadata)..."
  );

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      if (!columnExists("source_items", "metadata")) {
        database.exec(
          "ALTER TABLE source_items ADD COLUMN metadata TEXT"
        );
        console.log("[Migration] Added source_items.metadata column");
      }

      setSchemaVersion(14);
    })();

    console.log("[Migration] Successfully migrated to schema version 14");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    closeDatabase();
    restoreBackup(backupPath, dbPath);
    reopenConnection(dbPath);
    throw error;
  }
}
