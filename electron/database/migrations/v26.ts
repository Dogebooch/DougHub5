import { getDatabase, setSchemaVersion } from "../db-connection";

/**
 * Migration v26: Medical Knowledge Archetypes
 *
 * This migration adds:
 * 1. knowledge_entities table - Polymorphic storage for 8 medical archetypes:
 *    - illness_script (Diseases/Syndromes)
 *    - drug (Medications)
 *    - pathogen (Bacteria/Viruses/Fungi)
 *    - presentation (Chief Complaints + Physical Exam)
 *    - diagnostic (Labs/Imaging)
 *    - procedure (Skills/Interventions)
 *    - anatomy (Structures)
 *    - algorithm (Scores/Guidelines)
 *    - generic_concept (Fallback)
 * 2. knowledge_entity_links table - Bidirectional relationships between entities
 */
export function migrateToV26(): void {
  console.log(
    "[Migration] Starting migration to schema version 26 (Knowledge Archetypes)...",
  );
  const database = getDatabase();

  database.transaction(() => {
    // =========================================================================
    // 1. Create knowledge_entities table
    // =========================================================================
    console.log("[Migration] Creating knowledge_entities table...");
    database.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_entities (
        id TEXT PRIMARY KEY,
        entityType TEXT NOT NULL,
        title TEXT NOT NULL,
        domains TEXT,
        canonicalTopicId TEXT,
        parentEntityId TEXT,
        structuredData TEXT NOT NULL,
        goldenTicketField TEXT,
        goldenTicketValue TEXT,
        aiHintGoldenTicket TEXT,
        visualMnemonicTags TEXT,
        sourceItemId TEXT,
        notebookBlockId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (canonicalTopicId) REFERENCES canonical_topics(id),
        FOREIGN KEY (parentEntityId) REFERENCES knowledge_entities(id),
        FOREIGN KEY (sourceItemId) REFERENCES source_items(id),
        FOREIGN KEY (notebookBlockId) REFERENCES notebook_blocks(id)
      );
    `);

    // =========================================================================
    // 2. Create knowledge_entity_links table
    // =========================================================================
    console.log("[Migration] Creating knowledge_entity_links table...");
    database.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_entity_links (
        id TEXT PRIMARY KEY,
        sourceEntityId TEXT NOT NULL,
        targetEntityId TEXT NOT NULL,
        linkType TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (sourceEntityId) REFERENCES knowledge_entities(id) ON DELETE CASCADE,
        FOREIGN KEY (targetEntityId) REFERENCES knowledge_entities(id) ON DELETE CASCADE
      );
    `);

    // =========================================================================
    // 3. Create indexes
    // =========================================================================
    console.log("[Migration] Creating indexes...");
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_entities_type ON knowledge_entities(entityType);
      CREATE INDEX IF NOT EXISTS idx_knowledge_entities_canonical_topic ON knowledge_entities(canonicalTopicId);
      CREATE INDEX IF NOT EXISTS idx_knowledge_entities_parent ON knowledge_entities(parentEntityId);
      CREATE INDEX IF NOT EXISTS idx_knowledge_entities_title ON knowledge_entities(title);
      CREATE INDEX IF NOT EXISTS idx_knowledge_entity_links_source ON knowledge_entity_links(sourceEntityId);
      CREATE INDEX IF NOT EXISTS idx_knowledge_entity_links_target ON knowledge_entity_links(targetEntityId);
    `);

    setSchemaVersion(26);
  })();

  console.log("[Migration] Successfully migrated to schema version 26");
}
