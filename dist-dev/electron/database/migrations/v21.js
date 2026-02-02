"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV21 = migrateToV21;
const db_connection_1 = require("../db-connection");
/**
 * Migration v21: Add transcription field to source_items FTS index
 *
 * Enables search of OCR-extracted text from PDFs and images
 */
function migrateToV21(dbPath) {
    console.log("[Migration] Starting migration to schema version 21 (transcription FTS)...");
    const db = (0, db_connection_1.getDatabase)();
    try {
        db.transaction(() => {
            // Drop existing FTS table and triggers
            db.exec(`
        DROP TRIGGER IF EXISTS source_items_fts_insert;
        DROP TRIGGER IF EXISTS source_items_fts_update;
        DROP TRIGGER IF EXISTS source_items_fts_delete;
        DROP TABLE IF EXISTS source_items_fts;
      `);
            // Recreate FTS table with transcription field
            db.exec(`
        CREATE VIRTUAL TABLE source_items_fts USING fts5(
          id UNINDEXED, title, rawContent, sourceName, transcription, tags,
          content=source_items, content_rowid=rowid
        );
      `);
            // Recreate triggers with transcription field
            db.exec(`
        CREATE TRIGGER source_items_fts_insert AFTER INSERT ON source_items BEGIN
          INSERT INTO source_items_fts(rowid, id, title, rawContent, sourceName, transcription, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.rawContent, NEW.sourceName, NEW.transcription, NEW.tags);
        END;
        
        CREATE TRIGGER source_items_fts_update AFTER UPDATE ON source_items BEGIN
          INSERT INTO source_items_fts(source_items_fts, rowid, id, title, rawContent, sourceName, transcription, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.rawContent, OLD.sourceName, OLD.transcription, OLD.tags);
          INSERT INTO source_items_fts(rowid, id, title, rawContent, sourceName, transcription, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.rawContent, NEW.sourceName, NEW.transcription, NEW.tags);
        END;
        
        CREATE TRIGGER source_items_fts_delete AFTER DELETE ON source_items BEGIN
          INSERT INTO source_items_fts(source_items_fts, rowid, id, title, rawContent, sourceName, transcription, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.rawContent, OLD.sourceName, OLD.transcription, OLD.tags);
        END;
      `);
            // Rebuild FTS index from existing data
            db.exec(`
        INSERT INTO source_items_fts(rowid, id, title, rawContent, sourceName, transcription, tags)
        SELECT rowid, id, title, rawContent, sourceName, transcription, tags FROM source_items;
      `);
            (0, db_connection_1.setSchemaVersion)(21);
        })();
        console.log("[Migration] Successfully migrated to schema version 21");
    }
    catch (error) {
        console.error("[Migration] Failed:", error);
        throw error;
    }
}
