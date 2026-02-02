"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV25 = migrateToV25;
const db_connection_1 = require("../db-connection");
/**
 * Migration v25: Performance Optimizations
 *
 * This migration adds:
 * 1. Indexes for foreign keys that are frequently queried but missing indexes
 *    - sourceBlockId (used in getBrowserList sibling counts)
 *    - parentListId (used in getBrowserList cloze counts)
 */
function migrateToV25() {
    console.log("[Migration] Starting migration to schema version 25 (Performance)...");
    const database = (0, db_connection_1.getDatabase)();
    database.transaction(() => {
        // =========================================================================
        // 1. Add missing foreign key indexes
        // =========================================================================
        console.log("[Migration] Adding performance indexes...");
        // Index for sourceBlockId (critical for deck/sibling lookups)
        database.exec(`
      CREATE INDEX IF NOT EXISTS idx_cards_source_block
      ON cards(sourceBlockId);
    `);
        // Index for parentListId (critical for cloze grouping lookups)
        database.exec(`
      CREATE INDEX IF NOT EXISTS idx_cards_parent_list
      ON cards(parentListId);
    `);
        (0, db_connection_1.setSchemaVersion)(25);
    })();
    console.log("[Migration] Successfully migrated to schema version 25");
}
