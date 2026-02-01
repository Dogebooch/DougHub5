import { getDatabase, setSchemaVersion } from "../db-connection";

/**
 * Migration v27: AI Archetype Suggestions
 *
 * This migration adds:
 * 1. suggestedArchetypes column to source_items - Stores AI-detected archetype types
 *    for future one-click knowledge entity extraction from captured content
 */
export function migrateToV27(): void {
  console.log(
    "[Migration] Starting migration to schema version 27 (AI Suggestions)...",
  );
  const database = getDatabase();

  database.transaction(() => {
    // =========================================================================
    // 1. Add suggestedArchetypes column to source_items
    // =========================================================================
    console.log(
      "[Migration] Adding suggestedArchetypes column to source_items...",
    );
    database.exec(`
      ALTER TABLE source_items ADD COLUMN suggestedArchetypes TEXT;
    `);

    setSchemaVersion(27);
  })();

  console.log("[Migration] Successfully migrated to schema version 27");
}
