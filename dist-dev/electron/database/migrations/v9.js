"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV9 = migrateToV9;
const backup_service_1 = require("../../backup-service");
const db_connection_1 = require("../db-connection");
function migrateToV9(dbPath) {
    console.log("[Migration] Starting migration to schema version 9 (User review annotations)...");
    const backupPath = (0, backup_service_1.createBackup)(dbPath);
    console.log(`[Migration] Backup created: ${backupPath}`);
    const database = (0, db_connection_1.getDatabase)();
    try {
        database.transaction(() => {
            if (!(0, db_connection_1.columnExists)("review_logs", "userAnswer")) {
                database.exec("ALTER TABLE review_logs ADD COLUMN userAnswer TEXT");
                console.log("[Migration] Added review_logs.userAnswer column");
            }
            if (!(0, db_connection_1.columnExists)("review_logs", "userExplanation")) {
                database.exec("ALTER TABLE review_logs ADD COLUMN userExplanation TEXT");
                console.log("[Migration] Added review_logs.userExplanation column");
            }
            (0, db_connection_1.setSchemaVersion)(9);
        })();
        console.log("[Migration] Successfully migrated to schema version 9");
    }
    catch (error) {
        console.error("[Migration] Failed, restoring backup:", error);
        (0, db_connection_1.closeDatabase)();
        (0, backup_service_1.restoreBackup)(backupPath, dbPath);
        (0, db_connection_1.reopenConnection)(dbPath);
        throw error;
    }
}
