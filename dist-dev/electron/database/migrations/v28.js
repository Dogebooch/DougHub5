"use strict";
/**
 * Migration v28: Practice Bank Flashcard System
 *
 * Implements the "Anti-Anki-Hell" tiered flashcard architecture:
 * - practice_bank_flashcards: Stores all flashcards (Golden Ticket + Practice Bank)
 * - Each card is linked to a knowledge_entity
 * - FSRS state tracking for spaced repetition
 * - is_active flag controls whether card is in review queue
 * - Supports archetype-specific card types
 *
 * Philosophy:
 * - Cards generated at Forging, not at Ingestion
 * - Golden Ticket = is_active by default
 * - Practice Bank = is_active = false (suspended until needed)
 * - Simulator failure → activate specific Practice Bank card
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV28 = migrateToV28;
const db_connection_1 = require("../db-connection");
function migrateToV28() {
    const db = (0, db_connection_1.getDatabase)();
    db.exec(`
    -- Practice Bank Flashcards Table
    CREATE TABLE IF NOT EXISTS practice_bank_flashcards (
      id TEXT PRIMARY KEY,
      entityId TEXT NOT NULL,

      -- Card Content
      cardType TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,

      -- Golden Ticket vs Practice Bank
      isGoldenTicket INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 0,

      -- FSRS Scheduling State
      stability REAL DEFAULT 0,
      difficulty REAL DEFAULT 0,
      elapsedDays REAL DEFAULT 0,
      scheduledDays REAL DEFAULT 0,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      state INTEGER DEFAULT 0,
      dueDate TEXT,
      lastReview TEXT,

      -- Maturity Tracking
      maturityState TEXT DEFAULT 'new',
      retiredAt TEXT,
      resurrectCount INTEGER DEFAULT 0,

      -- Metadata
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,

      -- Foreign Key (no enforcement in SQLite by default)
      FOREIGN KEY (entityId) REFERENCES knowledge_entities(id) ON DELETE CASCADE
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_pb_flashcards_entityId ON practice_bank_flashcards(entityId);
    CREATE INDEX IF NOT EXISTS idx_pb_flashcards_isActive ON practice_bank_flashcards(isActive);
    CREATE INDEX IF NOT EXISTS idx_pb_flashcards_dueDate ON practice_bank_flashcards(dueDate);
    CREATE INDEX IF NOT EXISTS idx_pb_flashcards_state ON practice_bank_flashcards(state);
    CREATE INDEX IF NOT EXISTS idx_pb_flashcards_maturityState ON practice_bank_flashcards(maturityState);
    CREATE INDEX IF NOT EXISTS idx_pb_flashcards_isGoldenTicket ON practice_bank_flashcards(isGoldenTicket);

    -- Simulator Vignette Attempts Table (tracks Simulator usage)
    CREATE TABLE IF NOT EXISTS simulator_attempts (
      id TEXT PRIMARY KEY,
      entityId TEXT NOT NULL,
      vignetteText TEXT NOT NULL,
      userAnswer TEXT,
      correctAnswer TEXT NOT NULL,
      isCorrect INTEGER NOT NULL,
      failureAttributions TEXT,
      attemptedAt TEXT NOT NULL,

      FOREIGN KEY (entityId) REFERENCES knowledge_entities(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_simulator_attempts_entityId ON simulator_attempts(entityId);
    CREATE INDEX IF NOT EXISTS idx_simulator_attempts_isCorrect ON simulator_attempts(isCorrect);
    CREATE INDEX IF NOT EXISTS idx_simulator_attempts_attemptedAt ON simulator_attempts(attemptedAt);

    -- Add audioFilePath to knowledge_entities for audio-based cards
    ALTER TABLE knowledge_entities ADD COLUMN audioFilePath TEXT;
  `);
    (0, db_connection_1.setSchemaVersion)(28);
    console.log("[Migration v28] Practice Bank Flashcard System created");
}
