"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV11 = migrateToV11;
const backup_service_1 = require("../../backup-service");
const db_connection_1 = require("../db-connection");
function migrateToV11(dbPath) {
    console.log("[Migration] Starting migration to schema version 11 (Source raw pages)...");
    const backupPath = (0, backup_service_1.createBackup)(dbPath);
    console.log(`[Migration] Backup created: ${backupPath}`);
    const database = (0, db_connection_1.getDatabase)();
    try {
        database.transaction(() => {
            if (!(0, db_connection_1.tableExists)("source_raw_pages")) {
                database.exec(`
          CREATE TABLE source_raw_pages (
            sourceItemId TEXT PRIMARY KEY,
            htmlPayload TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (sourceItemId) REFERENCES source_items(id) ON DELETE CASCADE
          )
        `);
                console.log("[Migration] Created source_raw_pages table");
            }
            (0, db_connection_1.setSchemaVersion)(11);
        })();
        console.log("[Migration] Successfully migrated to schema version 11");
    }
    catch (error) {
        console.error("[Migration] Failed, restoring backup:", error);
        (0, db_connection_1.closeDatabase)();
        (0, backup_service_1.restoreBackup)(backupPath, dbPath);
        (0, db_connection_1.reopenConnection)(dbPath);
        throw error;
    }
}
