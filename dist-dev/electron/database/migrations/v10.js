"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV10 = migrateToV10;
const backup_service_1 = require("../../backup-service");
const db_connection_1 = require("../db-connection");
function migrateToV10(dbPath) {
    console.log("[Migration] Starting migration to schema version 10 (Card AI titles)...");
    const backupPath = (0, backup_service_1.createBackup)(dbPath);
    console.log(`[Migration] Backup created: ${backupPath}`);
    const database = (0, db_connection_1.getDatabase)();
    try {
        database.transaction(() => {
            if (!(0, db_connection_1.columnExists)("cards", "aiTitle")) {
                database.exec("ALTER TABLE cards ADD COLUMN aiTitle TEXT");
                console.log("[Migration] Added cards.aiTitle column");
            }
            (0, db_connection_1.setSchemaVersion)(10);
        })();
        console.log("[Migration] Successfully migrated to schema version 10");
    }
    catch (error) {
        console.error("[Migration] Failed, restoring backup:", error);
        (0, db_connection_1.closeDatabase)();
        (0, backup_service_1.restoreBackup)(backupPath, dbPath);
        (0, db_connection_1.reopenConnection)(dbPath);
        throw error;
    }
}
