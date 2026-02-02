"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialSchema = createInitialSchema;
function createInitialSchema(db, setSchemaVersion) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        noteId TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        dueDate TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        stability REAL DEFAULT 0,
        difficulty REAL DEFAULT 0,
        elapsedDays REAL DEFAULT 0,
        scheduledDays REAL DEFAULT 0,
        reps INTEGER DEFAULT 0,
        lapses INTEGER DEFAULT 0,
        state INTEGER DEFAULT 0,
        lastReview TEXT
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        cardIds TEXT NOT NULL DEFAULT '[]',
        tags TEXT NOT NULL DEFAULT '[]',
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS review_logs (
        id TEXT PRIMARY KEY,
        cardId TEXT NOT NULL,
        rating INTEGER NOT NULL,
        state INTEGER NOT NULL,
        scheduledDays REAL NOT NULL,
        elapsedDays REAL NOT NULL,
        review TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        responseTimeMs INTEGER,
        partialCreditScore REAL,
        responseTimeModifier REAL,
        userAnswer TEXT,
        userExplanation TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cards_noteId ON cards(noteId);
      CREATE INDEX IF NOT EXISTS idx_cards_dueDate ON cards(dueDate);
      CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
      CREATE INDEX IF NOT EXISTS idx_review_logs_cardId ON review_logs(cardId);
    `);
    setSchemaVersion(1);
}
