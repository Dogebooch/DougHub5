import { getDatabase, setSchemaVersion } from "../db-connection";

export function migrateToV22(): void {
  console.log("[Migration] Starting migration to schema version 22 (High Yield Flag)...");
  const database = getDatabase();

  database.transaction(() => {
    // Add isHighYield column to notebook_blocks
    // SQLite stores boolean as INTEGER: 0 = false, 1 = true
    // DEFAULT 0 ensures all existing blocks are marked as not high-yield
    database.exec(`
      ALTER TABLE notebook_blocks ADD COLUMN isHighYield INTEGER NOT NULL DEFAULT 0
    `);
    console.log("[Migration] Added isHighYield column to notebook_blocks");

    // Create index for efficient filtering by high-yield status within topic pages
    // Compound index supports: WHERE notebookTopicPageId = ? AND isHighYield = 1
    database.exec(`
      CREATE INDEX idx_notebook_block_high_yield 
      ON notebook_blocks(notebookTopicPageId, isHighYield)
    `);
    console.log("[Migration] Created index on (notebookTopicPageId, isHighYield)");

    setSchemaVersion(22);
  })();

  console.log("[Migration] Successfully migrated to version 22");
}
