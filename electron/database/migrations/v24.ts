import { getDatabase, setSchemaVersion } from "../db-connection";

/**
 * Migration v24: Notebook v2 - Intake Quiz & Smart Card Activation
 *
 * This migration adds:
 * 1. Card activation fields (activationStatus, activationTier, activationReasons, etc.)
 * 2. NotebookBlock quiz tracking (intakeQuizResult, intakeQuizAnswer, priorityScore, etc.)
 * 3. block_topic_assignments table for multi-topic support
 * 4. intake_quiz_attempts table
 * 5. topic_quiz_attempts table
 * 6. confusion_patterns table
 * 7. notebook_topic_pages.lastVisitedAt column
 * 8. Indexes for new columns and tables
 */
export function migrateToV24(): void {
  console.log("[Migration] Starting migration to schema version 24 (Notebook v2)...");
  const database = getDatabase();

  database.transaction(() => {
    // =========================================================================
    // 1. Card activation fields
    // =========================================================================
    console.log("[Migration] Adding card activation fields...");

    // activationStatus: 'dormant' | 'suggested' | 'active' | 'suspended' | 'graduated'
    database.exec(`
      ALTER TABLE cards ADD COLUMN activationStatus TEXT NOT NULL DEFAULT 'active';
    `);

    // activationTier: 'auto' | 'suggested' | 'user_manual' | null
    database.exec(`
      ALTER TABLE cards ADD COLUMN activationTier TEXT;
    `);

    // activationReasons: JSON array of strings explaining why card was activated
    database.exec(`
      ALTER TABLE cards ADD COLUMN activationReasons TEXT;
    `);

    // activatedAt: ISO timestamp when card was activated
    database.exec(`
      ALTER TABLE cards ADD COLUMN activatedAt TEXT;
    `);

    // suspendReason: 'user' | 'leech' | 'rotation_end' | null
    database.exec(`
      ALTER TABLE cards ADD COLUMN suspendReason TEXT;
    `);

    // suspendedAt: ISO timestamp when card was suspended
    database.exec(`
      ALTER TABLE cards ADD COLUMN suspendedAt TEXT;
    `);

    // =========================================================================
    // 2. NotebookBlock quiz tracking fields
    // =========================================================================
    console.log("[Migration] Adding notebook_blocks quiz tracking fields...");

    // intakeQuizResult: 'correct' | 'wrong' | 'skipped' | null
    database.exec(`
      ALTER TABLE notebook_blocks ADD COLUMN intakeQuizResult TEXT;
    `);

    // intakeQuizAnswer: User's actual answer text (for review)
    database.exec(`
      ALTER TABLE notebook_blocks ADD COLUMN intakeQuizAnswer TEXT;
    `);

    // priorityScore: 0-100 score for display priority (default 50)
    database.exec(`
      ALTER TABLE notebook_blocks ADD COLUMN priorityScore INTEGER DEFAULT 50;
    `);

    // priorityReasons: JSON array of strings explaining priority score
    database.exec(`
      ALTER TABLE notebook_blocks ADD COLUMN priorityReasons TEXT;
    `);

    // =========================================================================
    // 3. Multi-topic support: block_topic_assignments junction table
    // =========================================================================
    console.log("[Migration] Creating block_topic_assignments table...");

    database.exec(`
      CREATE TABLE IF NOT EXISTS block_topic_assignments (
        id TEXT PRIMARY KEY,
        blockId TEXT NOT NULL,
        topicPageId TEXT NOT NULL,
        isPrimaryTopic INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (blockId) REFERENCES notebook_blocks(id) ON DELETE CASCADE,
        FOREIGN KEY (topicPageId) REFERENCES notebook_topic_pages(id) ON DELETE CASCADE,
        UNIQUE(blockId, topicPageId)
      );
    `);

    // =========================================================================
    // 4. Intake quiz attempt tracking
    // =========================================================================
    console.log("[Migration] Creating intake_quiz_attempts table...");

    database.exec(`
      CREATE TABLE IF NOT EXISTS intake_quiz_attempts (
        id TEXT PRIMARY KEY,
        sourceItemId TEXT NOT NULL,
        notebookTopicPageId TEXT NOT NULL,
        blockId TEXT NOT NULL,
        questionText TEXT NOT NULL,
        userAnswer TEXT,
        isCorrect INTEGER,
        wasSkipped INTEGER DEFAULT 0,
        attemptedAt TEXT NOT NULL,
        FOREIGN KEY (sourceItemId) REFERENCES source_items(id),
        FOREIGN KEY (notebookTopicPageId) REFERENCES notebook_topic_pages(id),
        FOREIGN KEY (blockId) REFERENCES notebook_blocks(id)
      );
    `);

    // =========================================================================
    // 5. Topic entry quiz tracking (7-day spaced retrieval)
    // =========================================================================
    console.log("[Migration] Creating topic_quiz_attempts table...");

    database.exec(`
      CREATE TABLE IF NOT EXISTS topic_quiz_attempts (
        id TEXT PRIMARY KEY,
        notebookTopicPageId TEXT NOT NULL,
        blockId TEXT NOT NULL,
        questionText TEXT NOT NULL,
        isCorrect INTEGER,
        attemptedAt TEXT NOT NULL,
        daysSinceLastVisit INTEGER,
        FOREIGN KEY (notebookTopicPageId) REFERENCES notebook_topic_pages(id),
        FOREIGN KEY (blockId) REFERENCES notebook_blocks(id)
      );
    `);

    // =========================================================================
    // 6. Confusion pattern detection
    // =========================================================================
    console.log("[Migration] Creating confusion_patterns table...");

    database.exec(`
      CREATE TABLE IF NOT EXISTS confusion_patterns (
        id TEXT PRIMARY KEY,
        conceptA TEXT NOT NULL,
        conceptB TEXT NOT NULL,
        topicIds TEXT NOT NULL,
        occurrenceCount INTEGER DEFAULT 1,
        lastOccurrence TEXT NOT NULL,
        disambiguationCardId TEXT,
        UNIQUE(conceptA, conceptB)
      );
    `);

    // =========================================================================
    // 7. Topic last visit tracking for entry quiz threshold
    // =========================================================================
    console.log("[Migration] Adding notebook_topic_pages.lastVisitedAt column...");

    database.exec(`
      ALTER TABLE notebook_topic_pages ADD COLUMN lastVisitedAt TEXT;
    `);

    // =========================================================================
    // 8. Indexes for performance
    // =========================================================================
    console.log("[Migration] Creating indexes...");

    // Card activation status index (for filtering active cards)
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_cards_activation_status
      ON cards(activationStatus);
    `);

    // Card activation + due date compound index (for review queue)
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_cards_activation_due
      ON cards(activationStatus, dueDate)
      WHERE activationStatus = 'active';
    `);

    // Block priority index (for sorted display)
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_blocks_priority
      ON notebook_blocks(notebookTopicPageId, priorityScore DESC);
    `);

    // Block topic assignments indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_block_topic_by_block
      ON block_topic_assignments(blockId);
    `);

    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_block_topic_by_page
      ON block_topic_assignments(topicPageId);
    `);

    // Intake quiz source index
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_intake_quiz_source
      ON intake_quiz_attempts(sourceItemId);
    `);

    // Topic quiz page index
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_topic_quiz_page
      ON topic_quiz_attempts(notebookTopicPageId);
    `);

    // Confusion patterns concept index
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_confusion_concepts
      ON confusion_patterns(conceptA, conceptB);
    `);

    // =========================================================================
    // 9. Backfill: Set existing cards to 'active' status with activatedAt
    // =========================================================================
    console.log("[Migration] Backfilling existing cards with activation data...");

    const now = new Date().toISOString();
    database.exec(`
      UPDATE cards
      SET activationStatus = 'active',
          activationTier = 'user_manual',
          activatedAt = '${now}'
      WHERE activationStatus = 'active' AND activatedAt IS NULL;
    `);

    // =========================================================================
    // 10. Backfill: Create block_topic_assignments for existing blocks
    // =========================================================================
    console.log("[Migration] Backfilling block_topic_assignments for existing blocks...");

    // Get all existing blocks and create primary assignments
    const existingBlocks = database
      .prepare(
        `SELECT id, notebookTopicPageId FROM notebook_blocks WHERE notebookTopicPageId IS NOT NULL`
      )
      .all() as Array<{ id: string; notebookTopicPageId: string }>;

    const insertAssignment = database.prepare(`
      INSERT OR IGNORE INTO block_topic_assignments (id, blockId, topicPageId, isPrimaryTopic, createdAt)
      VALUES (?, ?, ?, 1, ?)
    `);

    for (const block of existingBlocks) {
      const assignmentId = `bta_${block.id}_${block.notebookTopicPageId}`;
      insertAssignment.run(assignmentId, block.id, block.notebookTopicPageId, now);
    }

    console.log(
      `[Migration] Created ${existingBlocks.length} block_topic_assignments for existing blocks`
    );

    setSchemaVersion(24);
  })();

  console.log("[Migration] Successfully migrated to schema version 24");
}
