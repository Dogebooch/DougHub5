import { getDatabase, setSchemaVersion } from "../db-connection";

/**
 * Migration v23: Backfill correctness column and add index
 *
 * The correctness column was added in v18 but never populated during capture.
 * This migration:
 * 1. Backfills correctness from rawContent.wasCorrect for existing qbank items
 * 2. Adds an index on correctness for filter performance
 */
export function migrateToV23(): void {
  console.log("[Migration] Starting migration to schema version 23 (Backfill correctness)...");
  const database = getDatabase();

  database.transaction(() => {
    // 1. Add index on correctness for faster filtering
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_source_items_correctness
      ON source_items(correctness) WHERE correctness IS NOT NULL;
    `);
    console.log("[Migration] Created index on source_items.correctness");

    // 2. Backfill correctness from rawContent for qbank items
    // Get all qbank items where correctness is NULL but rawContent exists
    const stmt = database.prepare(`
      SELECT id, rawContent FROM source_items
      WHERE sourceType = 'qbank' AND correctness IS NULL AND rawContent IS NOT NULL
    `);
    const rows = stmt.all() as Array<{ id: string; rawContent: string }>;

    let backfilledCount = 0;
    const updateStmt = database.prepare(`
      UPDATE source_items SET correctness = ? WHERE id = ?
    `);

    for (const row of rows) {
      try {
        const content = JSON.parse(row.rawContent);
        if (typeof content.wasCorrect === "boolean") {
          const correctness = content.wasCorrect ? "correct" : "incorrect";
          updateStmt.run(correctness, row.id);
          backfilledCount++;
        }
      } catch (e) {
        // Skip items with invalid JSON
        console.warn(`[Migration] Failed to parse rawContent for ${row.id}:`, e);
      }
    }

    console.log(`[Migration] Backfilled correctness for ${backfilledCount} qbank items`);

    setSchemaVersion(23);
  })();

  console.log("[Migration] Successfully migrated to schema version 23");
}
