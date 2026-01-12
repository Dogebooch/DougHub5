import { createBackup, restoreBackup } from "../../backup-service";
import {
  closeDatabase,
  columnExists,
  getDatabase,
  reopenConnection,
  setSchemaVersion,
} from "../db-connection";

export function migrateToV9(dbPath: string): void {
  console.log(
    "[Migration] Starting migration to schema version 9 (User review annotations)..."
  );

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      if (!columnExists("review_logs", "userAnswer")) {
        database.exec("ALTER TABLE review_logs ADD COLUMN userAnswer TEXT");
        console.log("[Migration] Added review_logs.userAnswer column");
      }

      if (!columnExists("review_logs", "userExplanation")) {
        database.exec(
          "ALTER TABLE review_logs ADD COLUMN userExplanation TEXT"
        );
        console.log("[Migration] Added review_logs.userExplanation column");
      }

      setSchemaVersion(9);
    })();

    console.log("[Migration] Successfully migrated to schema version 9");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    closeDatabase();
    restoreBackup(backupPath, dbPath);
    reopenConnection(dbPath);
    throw error;
  }
}
