import { createBackup, restoreBackup } from "../../backup-service";
import { getDatabase, reopenConnection, setSchemaVersion } from "../db-connection";

export function migrateToV4(dbPath: string): void {
  console.log("[Migration] Starting migration to schema version 4 (FTS5)...");

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      database.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
          id UNINDEXED, front, back, tags,
          content=cards, content_rowid=rowid
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
          id UNINDEXED, title, content, tags,
          content=notes, content_rowid=rowid
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS source_items_fts USING fts5(
          id UNINDEXED, title, rawContent, sourceName, tags,
          content=source_items, content_rowid=rowid
        );
      `);

      database.exec(`
        CREATE TRIGGER IF NOT EXISTS cards_fts_insert AFTER INSERT ON cards BEGIN
          INSERT INTO cards_fts(rowid, id, front, back, tags)
          VALUES (NEW.rowid, NEW.id, NEW.front, NEW.back, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS cards_fts_update AFTER UPDATE ON cards BEGIN
          INSERT INTO cards_fts(cards_fts, rowid, id, front, back, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.front, OLD.back, OLD.tags);
          INSERT INTO cards_fts(rowid, id, front, back, tags)
          VALUES (NEW.rowid, NEW.id, NEW.front, NEW.back, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS cards_fts_delete AFTER DELETE ON cards BEGIN
          INSERT INTO cards_fts(cards_fts, rowid, id, front, back, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.front, OLD.back, OLD.tags);
        END;
      `);

      database.exec(`
        CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
          INSERT INTO notes_fts(rowid, id, title, content, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.content, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
          INSERT INTO notes_fts(notes_fts, rowid, id, title, content, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.content, OLD.tags);
          INSERT INTO notes_fts(rowid, id, title, content, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.content, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
          INSERT INTO notes_fts(notes_fts, rowid, id, title, content, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.content, OLD.tags);
        END;
      `);

      database.exec(`
        CREATE TRIGGER IF NOT EXISTS source_items_fts_insert AFTER INSERT ON source_items BEGIN
          INSERT INTO source_items_fts(rowid, id, title, rawContent, sourceName, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.rawContent, NEW.sourceName, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS source_items_fts_update AFTER UPDATE ON source_items BEGIN
          INSERT INTO source_items_fts(source_items_fts, rowid, id, title, rawContent, sourceName, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.rawContent, OLD.sourceName, OLD.tags);
          INSERT INTO source_items_fts(rowid, id, title, rawContent, sourceName, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.rawContent, NEW.sourceName, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS source_items_fts_delete AFTER DELETE ON source_items BEGIN
          INSERT INTO source_items_fts(source_items_fts, rowid, id, title, rawContent, sourceName, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.rawContent, OLD.sourceName, OLD.tags);
        END;
      `);

      database.exec(`
        INSERT INTO cards_fts(rowid, id, front, back, tags)
        SELECT rowid, id, front, back, tags FROM cards;
        INSERT INTO notes_fts(rowid, id, title, content, tags)
        SELECT rowid, id, title, content, tags FROM notes;
        INSERT INTO source_items_fts(rowid, id, title, rawContent, sourceName, tags)
        SELECT rowid, id, title, rawContent, sourceName, tags FROM source_items;
      `);

      setSchemaVersion(4);
    })();

    console.log("[Migration] Successfully migrated to schema version 4");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    database.close();
    restoreBackup(backupPath, dbPath);
    reopenConnection(dbPath);
    throw error;
  }
}