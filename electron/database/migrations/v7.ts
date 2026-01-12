import { createBackup, restoreBackup } from "../../backup-service";
import {
  columnExists,
  getDatabase,
  reopenConnection,
  setSchemaVersion,
} from "../db-connection";

export function migrateToV7(dbPath: string): void {
  console.log(
    "[Migration] Starting migration to schema version 7 (Response Modifier)..."
  );

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      if (!columnExists("review_logs", "responseTimeModifier")) {
        database.exec(
          "ALTER TABLE review_logs ADD COLUMN responseTimeModifier REAL"
        );
        console.log("[Migration] Added review_logs.responseTimeModifier column");
      }

      setSchemaVersion(7);
    })();

    console.log("[Migration] Successfully migrated to schema version 7");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    database.close();
    restoreBackup(backupPath, dbPath);
    reopenConnection(dbPath);
    throw error;
  }
}