"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV15 = migrateToV15;
const db_connection_1 = require("../db-connection");
function migrateToV15() {
    console.log("[Migration] Starting migration to schema version 15 (Reference Ranges)...");
    const database = (0, db_connection_1.getDatabase)();
    database.transaction(() => {
        database.exec(`
        CREATE TABLE IF NOT EXISTS reference_ranges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          test_name TEXT NOT NULL,
          normal_range TEXT NOT NULL,
          units TEXT,
          si_range TEXT,
          notes TEXT,
          source TEXT DEFAULT 'MKSAP19'
        );
        CREATE INDEX IF NOT EXISTS idx_reference_ranges_category ON reference_ranges(category);
        CREATE INDEX IF NOT EXISTS idx_reference_ranges_test ON reference_ranges(test_name);
        
        -- Create FTS5 virtual table for fast search
        CREATE VIRTUAL TABLE IF NOT EXISTS reference_ranges_fts USING fts5(
          test_name,
          category,
          normal_range,
          notes,
          content='reference_ranges',
          content_rowid='id'
        );
        
        -- Create triggers to keep FTS index in sync
        CREATE TRIGGER IF NOT EXISTS reference_ranges_ai AFTER INSERT ON reference_ranges BEGIN
          INSERT INTO reference_ranges_fts(rowid, test_name, category, normal_range, notes)
          VALUES (new.id, new.test_name, new.category, new.normal_range, new.notes);
        END;
        
        CREATE TRIGGER IF NOT EXISTS reference_ranges_ad AFTER DELETE ON reference_ranges BEGIN
          DELETE FROM reference_ranges_fts WHERE rowid = old.id;
        END;
        
        CREATE TRIGGER IF NOT EXISTS reference_ranges_au AFTER UPDATE ON reference_ranges BEGIN
          UPDATE reference_ranges_fts SET 
            test_name = new.test_name,
            category = new.category,
            normal_range = new.normal_range,
            notes = new.notes
          WHERE rowid = old.id;
        END;
      `);
        console.log("[Migration] Created reference_ranges table, indexes, and FTS5 search");
        (0, db_connection_1.setSchemaVersion)(15);
    })();
    console.log("[Migration] Successfully migrated to schema version 15");
}
