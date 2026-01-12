import { createBackup, restoreBackup } from "../../backup-service";
import {
  closeDatabase,
  getDatabase,
  reopenConnection,
  setSchemaVersion,
} from "../db-connection";
import { compressString } from "../helpers";

export function migrateToV12(dbPath: string): void {
  console.log(
    "[Migration] Starting migration to schema version 12 (HTML compression)..."
  );

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.exec(`
      CREATE TABLE source_raw_pages_new (
        sourceItemId TEXT PRIMARY KEY,
        htmlPayload BLOB NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (sourceItemId) REFERENCES source_items(id) ON DELETE CASCADE
      )
    `);

    const rows = database
      .prepare(
        "SELECT sourceItemId, htmlPayload, createdAt FROM source_raw_pages"
      )
      .all() as {
      sourceItemId: string;
      htmlPayload: string;
      createdAt: string;
    }[];

    const insertStmt = database.prepare(`
      INSERT INTO source_raw_pages_new (sourceItemId, htmlPayload, createdAt)
      VALUES (?, ?, ?)
    `);

    database.transaction(() => {
      for (const row of rows) {
        const compressed = compressString(row.htmlPayload);
        insertStmt.run(row.sourceItemId, compressed, row.createdAt);
      }

      database.exec("DROP TABLE source_raw_pages");
      database.exec(
        "ALTER TABLE source_raw_pages_new RENAME TO source_raw_pages"
      );
      setSchemaVersion(12);
    })();

    console.log("[Migration] Successfully migrated to schema version 12");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    closeDatabase();
    restoreBackup(backupPath, dbPath);
    reopenConnection(dbPath);
    throw error;
  }
}
