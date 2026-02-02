"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV12 = migrateToV12;
const backup_service_1 = require("../../backup-service");
const db_connection_1 = require("../db-connection");
const helpers_1 = require("../helpers");
function migrateToV12(dbPath) {
    console.log("[Migration] Starting migration to schema version 12 (HTML compression)...");
    const backupPath = (0, backup_service_1.createBackup)(dbPath);
    console.log(`[Migration] Backup created: ${backupPath}`);
    const database = (0, db_connection_1.getDatabase)();
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
            .prepare("SELECT sourceItemId, htmlPayload, createdAt FROM source_raw_pages")
            .all();
        const insertStmt = database.prepare(`
      INSERT INTO source_raw_pages_new (sourceItemId, htmlPayload, createdAt)
      VALUES (?, ?, ?)
    `);
        database.transaction(() => {
            for (const row of rows) {
                const compressed = (0, helpers_1.compressString)(row.htmlPayload);
                insertStmt.run(row.sourceItemId, compressed, row.createdAt);
            }
            database.exec("DROP TABLE source_raw_pages");
            database.exec("ALTER TABLE source_raw_pages_new RENAME TO source_raw_pages");
            (0, db_connection_1.setSchemaVersion)(12);
        })();
        console.log("[Migration] Successfully migrated to schema version 12");
    }
    catch (error) {
        console.error("[Migration] Failed, restoring backup:", error);
        (0, db_connection_1.closeDatabase)();
        (0, backup_service_1.restoreBackup)(backupPath, dbPath);
        (0, db_connection_1.reopenConnection)(dbPath);
        throw error;
    }
}
