"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV20 = migrateToV20;
const db_connection_1 = require("../db-connection");
function migrateToV20() {
    console.log("[Migration] Starting migration to schema version 20 (Callout Types)...");
    const database = (0, db_connection_1.getDatabase)();
    database.transaction(() => {
        // Add calloutType column to notebook_blocks
        // Values: 'pearl' | 'trap' | 'caution' | null
        database.exec(`
      ALTER TABLE notebook_blocks ADD COLUMN calloutType TEXT
    `);
        console.log("[Migration] Added calloutType column to notebook_blocks");
        (0, db_connection_1.setSchemaVersion)(20);
    })();
    console.log("[Migration] Successfully migrated to version 20");
}
