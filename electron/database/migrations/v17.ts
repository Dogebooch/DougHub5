import { getDatabase, setSchemaVersion } from "../db-connection";

export function migrateToV17(): void {
  console.log("[Migration] Starting migration to schema version 17 (Notebook Links)...");
  const database = getDatabase();
  database.transaction(() => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS notebook_links (
        id TEXT PRIMARY KEY,
        sourceBlockId TEXT NOT NULL REFERENCES notebook_blocks(id) ON DELETE CASCADE,
        targetBlockId TEXT NOT NULL REFERENCES notebook_blocks(id) ON DELETE CASCADE,
        linkType TEXT NOT NULL CHECK(linkType IN ('same_concept', 'related_topic', 'cross_specialty', 'comparison', 'builds_on')),
        reason TEXT,
        anchorText TEXT,
        anchorStart INTEGER,
        anchorEnd INTEGER,
        createdAt TEXT NOT NULL,
        UNIQUE(sourceBlockId, targetBlockId),
        CHECK(sourceBlockId != targetBlockId)
      );
      
      CREATE INDEX IF NOT EXISTS idx_notebook_links_source ON notebook_links(sourceBlockId);
      CREATE INDEX IF NOT EXISTS idx_notebook_links_target ON notebook_links(targetBlockId);
    `);
    console.log("[Migration] Created notebook_links table and indices");
    setSchemaVersion(17);
  })();
}
