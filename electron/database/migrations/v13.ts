import { createBackup, restoreBackup } from "../../backup-service";
import {
  closeDatabase,
  getDatabase,
  reopenConnection,
  setSchemaVersion,
  columnExists,
} from "../db-connection";

export function migrateToV13(dbPath: string): void {
  console.log(
    "[Migration] Starting migration to schema version 13 (Settings alignment)..."
  );

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);

      if (!columnExists("settings", "updatedAt")) {
        database.exec(
          "ALTER TABLE settings ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''"
        );
        console.log("[Migration] Added settings.updatedAt column");
      }

      setSchemaVersion(13);
    })();

    console.log("[Migration] Successfully migrated to schema version 13");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    closeDatabase();
    restoreBackup(backupPath, dbPath);
    reopenConnection(dbPath);
    throw error;
  }
}
