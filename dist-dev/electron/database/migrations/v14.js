"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV14 = migrateToV14;
const backup_service_1 = require("../../backup-service");
const db_connection_1 = require("../db-connection");
function migrateToV14(dbPath) {
    console.log("[Migration] Starting migration to schema version 14 (SourceItem metadata)...");
    const backupPath = (0, backup_service_1.createBackup)(dbPath);
    console.log(`[Migration] Backup created: ${backupPath}`);
    const database = (0, db_connection_1.getDatabase)();
    try {
        database.transaction(() => {
            if (!(0, db_connection_1.columnExists)("source_items", "metadata")) {
                database.exec("ALTER TABLE source_items ADD COLUMN metadata TEXT");
                console.log("[Migration] Added source_items.metadata column");
            }
            (0, db_connection_1.setSchemaVersion)(14);
        })();
        console.log("[Migration] Successfully migrated to schema version 14");
    }
    catch (error) {
        console.error("[Migration] Failed, restoring backup:", error);
        (0, db_connection_1.closeDatabase)();
        (0, backup_service_1.restoreBackup)(backupPath, dbPath);
        (0, db_connection_1.reopenConnection)(dbPath);
        throw error;
    }
}
