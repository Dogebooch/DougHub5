-- V1 Database Schema (Pre-Migration)
-- Used for testing migration from v1 to v2
-- Missing: cardType, parentListId, listPosition, responseTimeMs, partialCreditScore
-- Missing tables: quick_dumps, connections
-- Missing indexes: idx_quick_dumps_status, idx_cards_cardType, idx_cards_parentListId, idx_connections_*

-- Schema version
PRAGMA user_version = 1;

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Notes table (unchanged between v1 and v2)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  cardIds TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Cards table (v1 - missing new v2 columns)
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  noteId TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  -- V2 adds: cardType, parentListId, listPosition
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  elapsedDays INTEGER NOT NULL DEFAULT 0,
  scheduledDays INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state INTEGER NOT NULL DEFAULT 0,
  lastReview TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
);

-- Review logs (v1 - missing new v2 columns)
CREATE TABLE IF NOT EXISTS review_logs (
  id TEXT PRIMARY KEY,
  cardId TEXT NOT NULL,
  rating INTEGER NOT NULL,
  state INTEGER NOT NULL,
  reviewedAt TEXT NOT NULL,
  -- V2 adds: responseTimeMs, partialCreditScore
  FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE
);

-- V1 does not have quick_dumps table
-- V1 does not have connections table
-- V1 does not have any indexes

-- Sample data for migration testing
INSERT INTO notes (id, title, content, tags, cardIds, createdAt, updatedAt) VALUES
  ('note-v1-001', 'Test Note 1', 'Content for migration testing', '["test"]', '["card-v1-001"]', '2025-12-01T00:00:00.000Z', '2025-12-01T00:00:00.000Z'),
  ('note-v1-002', 'Test Note 2', 'Another note', '["cardiology"]', '["card-v1-002", "card-v1-003"]', '2025-12-01T00:00:00.000Z', '2025-12-01T00:00:00.000Z');

INSERT INTO cards (id, front, back, noteId, tags, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview, createdAt, updatedAt) VALUES
  ('card-v1-001', 'Question 1?', 'Answer 1', 'note-v1-001', '["test"]', 2.5, 5.0, 0, 1, 1, 0, 1, NULL, '2025-12-01T00:00:00.000Z', '2025-12-01T00:00:00.000Z'),
  ('card-v1-002', 'Question 2?', 'Answer 2', 'note-v1-002', '["cardiology"]', 0, 0, 0, 0, 0, 0, 0, NULL, '2025-12-01T00:00:00.000Z', '2025-12-01T00:00:00.000Z'),
  ('card-v1-003', 'Question 3?', 'Answer 3', 'note-v1-002', '["cardiology"]', 10.2, 3.5, 5, 7, 5, 1, 2, '2026-01-01T00:00:00.000Z', '2025-12-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT INTO review_logs (id, cardId, rating, state, reviewedAt) VALUES
  ('log-v1-001', 'card-v1-001', 3, 1, '2025-12-15T10:00:00.000Z'),
  ('log-v1-002', 'card-v1-003', 4, 2, '2026-01-01T00:00:00.000Z'),
  ('log-v1-003', 'card-v1-003', 1, 3, '2025-12-20T15:30:00.000Z');
