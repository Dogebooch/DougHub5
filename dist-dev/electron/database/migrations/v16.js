"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV16 = migrateToV16;
const db_connection_1 = require("../db-connection");
function migrateToV16() {
    console.log("[Migration] Starting migration to schema version 16 (AI Evaluation fields)...");
    const database = (0, db_connection_1.getDatabase)();
    database.transaction(() => {
        // Add 4 new columns - all nullable for backward compatibility
        database.exec(`
      ALTER TABLE notebook_blocks ADD COLUMN userInsight TEXT;
      ALTER TABLE notebook_blocks ADD COLUMN aiEvaluation TEXT;
      ALTER TABLE notebook_blocks ADD COLUMN relevanceScore TEXT;
      ALTER TABLE notebook_blocks ADD COLUMN relevanceReason TEXT;
    `);
        console.log("[Migration] Added AI evaluation columns to notebook_blocks");
        (0, db_connection_1.setSchemaVersion)(16);
    })();
    console.log("[Migration] Successfully migrated to schema version 16");
}
