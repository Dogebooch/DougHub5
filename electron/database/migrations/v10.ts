import { createBackup, restoreBackup } from "../../backup-service";
import {
  closeDatabase,
  columnExists,
  getDatabase,
  reopenConnection,
  setSchemaVersion,
} from "../db-connection";

export function migrateToV10(dbPath: string): void {
  console.log(
    "[Migration] Starting migration to schema version 10 (Card AI titles)..."
  );

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      if (!columnExists("cards", "aiTitle")) {
        database.exec("ALTER TABLE cards ADD COLUMN aiTitle TEXT");
        console.log("[Migration] Added cards.aiTitle column");
      }

      setSchemaVersion(10);
    })();

    console.log("[Migration] Successfully migrated to schema version 10");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    closeDatabase();
    restoreBackup(backupPath, dbPath);
    reopenConnection(dbPath);
    throw error;
  }
}
