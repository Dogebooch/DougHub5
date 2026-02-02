"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV7 = migrateToV7;
const backup_service_1 = require("../../backup-service");
const db_connection_1 = require("../db-connection");
function migrateToV7(dbPath) {
    console.log("[Migration] Starting migration to schema version 7 (Response Modifier)...");
    const backupPath = (0, backup_service_1.createBackup)(dbPath);
    console.log(`[Migration] Backup created: ${backupPath}`);
    const database = (0, db_connection_1.getDatabase)();
    try {
        database.transaction(() => {
            if (!(0, db_connection_1.columnExists)("review_logs", "responseTimeModifier")) {
                database.exec("ALTER TABLE review_logs ADD COLUMN responseTimeModifier REAL");
                console.log("[Migration] Added review_logs.responseTimeModifier column");
            }
            (0, db_connection_1.setSchemaVersion)(7);
        })();
        console.log("[Migration] Successfully migrated to schema version 7");
    }
    catch (error) {
        console.error("[Migration] Failed, restoring backup:", error);
        database.close();
        (0, backup_service_1.restoreBackup)(backupPath, dbPath);
        (0, db_connection_1.reopenConnection)(dbPath);
        throw error;
    }
}
