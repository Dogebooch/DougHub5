"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV8 = migrateToV8;
const db_connection_1 = require("../db-connection");
function migrateToV8(dbPath) {
    console.log("[Migration] Starting migration to schema version 8 (Card difficulty index)...");
    void dbPath;
    const database = (0, db_connection_1.getDatabase)();
    try {
        database.transaction(() => {
            database.exec("CREATE INDEX IF NOT EXISTS idx_cards_difficulty ON cards(difficulty)");
            (0, db_connection_1.setSchemaVersion)(8);
        })();
        console.log("[Migration] Successfully migrated to schema version 8");
    }
    catch (error) {
        console.error("[Migration] Failed to migrate to schema version 8:", error);
        throw error;
    }
}
