import { createBackup, restoreBackup } from "../../backup-service";
import {
  columnExists,
  getDatabase,
  reopenConnection,
  setSchemaVersion,
  tableExists,
} from "../db-connection";

export function migrateToV2(dbPath: string): void {
  console.log("[Migration] Starting migration to schema version 2...");

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      if (!columnExists("cards", "cardType")) {
        database.exec(
          "ALTER TABLE cards ADD COLUMN cardType TEXT DEFAULT 'standard'"
        );
        console.log("[Migration] Added cards.cardType column");
      }
      if (!columnExists("cards", "parentListId")) {
        database.exec("ALTER TABLE cards ADD COLUMN parentListId TEXT");
        console.log("[Migration] Added cards.parentListId column");
      }
      if (!columnExists("cards", "listPosition")) {
        database.exec("ALTER TABLE cards ADD COLUMN listPosition INTEGER");
        console.log("[Migration] Added cards.listPosition column");
      }

      if (!columnExists("review_logs", "responseTimeMs")) {
        database.exec(
          "ALTER TABLE review_logs ADD COLUMN responseTimeMs INTEGER"
        );
        console.log("[Migration] Added review_logs.responseTimeMs column");
      }
      if (!columnExists("review_logs", "partialCreditScore")) {
        database.exec(
          "ALTER TABLE review_logs ADD COLUMN partialCreditScore REAL"
        );
        console.log("[Migration] Added review_logs.partialCreditScore column");
      }

      if (!tableExists("quick_dumps")) {
        database.exec(`
          CREATE TABLE quick_dumps (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            extractionStatus TEXT NOT NULL DEFAULT 'pending',
            createdAt TEXT NOT NULL,
            processedAt TEXT
          )
        `);
        database.exec(
          `CREATE INDEX idx_quick_dumps_status ON quick_dumps(extractionStatus)`
        );
        console.log("[Migration] Created quick_dumps table");
      }

      if (!tableExists("connections")) {
        database.exec(`
          CREATE TABLE connections (
            id TEXT PRIMARY KEY,
            sourceNoteId TEXT NOT NULL,
            targetNoteId TEXT NOT NULL,
            semanticScore REAL NOT NULL,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (sourceNoteId) REFERENCES notes(id) ON DELETE CASCADE,
            FOREIGN KEY (targetNoteId) REFERENCES notes(id) ON DELETE CASCADE
          )
        `);
        database.exec(
          `CREATE INDEX idx_connections_sourceNoteId ON connections(sourceNoteId)`
        );
        database.exec(
          `CREATE INDEX idx_connections_targetNoteId ON connections(targetNoteId)`
        );
        database.exec(
          `CREATE INDEX idx_connections_semanticScore ON connections(semanticScore)`
        );
        console.log("[Migration] Created connections table");
      }

      database.exec(
        `CREATE INDEX IF NOT EXISTS idx_cards_cardType ON cards(cardType)`
      );
      database.exec(
        `CREATE INDEX IF NOT EXISTS idx_cards_parentListId ON cards(parentListId)`
      );

      setSchemaVersion(2);
    })();

    console.log("[Migration] Successfully migrated to schema version 2");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    database.close();
    restoreBackup(backupPath, dbPath);
    reopenConnection(dbPath);
    throw error;
  }
}