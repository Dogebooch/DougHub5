"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV6 = migrateToV6;
const db_connection_1 = require("../db-connection");
function migrateToV6() {
    console.log("[Migration] Starting migration to schema version 6 (Settings)...");
    const database = (0, db_connection_1.getDatabase)();
    database.transaction(() => {
        database.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);
        if (!(0, db_connection_1.columnExists)("settings", "updatedAt")) {
            database.exec("ALTER TABLE settings ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''");
        }
        const now = new Date().toISOString();
        const stmt = database.prepare(`
        INSERT OR IGNORE INTO settings (key, value, updatedAt) 
        VALUES (?, ?, ?)
      `);
        stmt.run("review_count", "0", now);
        stmt.run("fsrs_parameters", "{}", now);
        stmt.run("last_optimization_date", "null", now);
        console.log("[Migration] Created settings table and seeded defaults");
        (0, db_connection_1.setSchemaVersion)(6);
    })();
    console.log("[Migration] Successfully migrated to schema version 6");
}
