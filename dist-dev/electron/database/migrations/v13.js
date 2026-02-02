"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV13 = migrateToV13;
const backup_service_1 = require("../../backup-service");
const db_connection_1 = require("../db-connection");
function migrateToV13(dbPath) {
    console.log("[Migration] Starting migration to schema version 13 (Settings alignment)...");
    const backupPath = (0, backup_service_1.createBackup)(dbPath);
    console.log(`[Migration] Backup created: ${backupPath}`);
    const database = (0, db_connection_1.getDatabase)();
    try {
        database.transaction(() => {
            database.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);
            if (!(0, db_connection_1.columnExists)("settings", "updatedAt")) {
                database.exec("ALTER TABLE settings ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''");
                console.log("[Migration] Added settings.updatedAt column");
            }
            (0, db_connection_1.setSchemaVersion)(13);
        })();
        console.log("[Migration] Successfully migrated to schema version 13");
    }
    catch (error) {
        console.error("[Migration] Failed, restoring backup:", error);
        (0, db_connection_1.closeDatabase)();
        (0, backup_service_1.restoreBackup)(backupPath, dbPath);
        (0, db_connection_1.reopenConnection)(dbPath);
        throw error;
    }
}
