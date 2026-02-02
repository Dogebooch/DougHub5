"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV19 = migrateToV19;
const db_connection_1 = require("../db-connection");
function migrateToV19() {
    console.log("[Migration] Starting migration to schema version 19 (Dev Settings)...");
    const database = (0, db_connection_1.getDatabase)();
    database.transaction(() => {
        database.exec(`
      CREATE TABLE IF NOT EXISTS dev_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updatedAt TEXT
      )
    `);
        console.log("[Migration] Created dev_settings table");
        (0, db_connection_1.setSchemaVersion)(19);
    })();
    console.log("[Migration] Successfully migrated to version 19");
}
