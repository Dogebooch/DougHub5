/**
 * Database Test Helpers
 * 
 * Utilities for creating, managing, and asserting on test databases.
 */

import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'
import { expect } from 'vitest'

// Type imports - these will be defined in actual application types
type Card = {
  id: string
  front: string
  back: string
  noteId: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

type Note = {
  id: string
  title: string
  content: string
  tags: string[]
  cardIds: string[]
  createdAt: string
  updatedAt: string
}

type QuickDump = {
  id: string
  content: string
  status: string
  createdAt: string
  processedAt: string | null
}

type Connection = {
  id: string
  sourceNoteId: string
  targetNoteId: string
  semanticScore: number
  createdAt: string
}

// v3 Architecture types
type SourceItem = {
  id: string
  sourceType: 'qbank' | 'article' | 'pdf' | 'image' | 'audio' | 'quickcapture' | 'manual'
  sourceName: string
  sourceUrl?: string
  title: string
  rawContent: string
  mediaPath?: string
  transcription?: string
  canonicalTopicIds: string[]
  tags: string[]
  questionId?: string
  status: 'inbox' | 'processed' | 'curated'
  createdAt: string
  processedAt?: string
  updatedAt?: string
}

type CanonicalTopic = {
  id: string
  canonicalName: string
  aliases: string[]
  domain: string
  parentTopicId?: string
  createdAt: string
}

type NotebookTopicPage = {
  id: string
  canonicalTopicId: string
  cardIds: string[]
  createdAt: string
  updatedAt: string
}

type NotebookBlock = {
  id: string
  notebookTopicPageId: string
  sourceItemId: string
  content: string
  annotations?: string
  mediaPath?: string
  position: number
}

type CardWithFSRS = Card & {
  cardType: string | null
  parentListId: string | null
  listPosition: number | null
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: number
  lastReview: string | null
}

/**
 * Create a unique test database file
 */
export function createTestDb(name: string = 'test'): { db: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `doughub-test-${name}-${Date.now()}.db`)
  const db = new Database(dbPath)
  
  // Enable foreign keys and WAL mode like production
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  
  return { db, dbPath }
}

/**
 * Clean up test database file
 */
export function cleanupTestDb(dbPath: string) {
  const db = new Database(dbPath)
  db.close()
  
  // Remove all SQLite files (main, WAL, SHM)
  ;[dbPath, `${dbPath}-wal`, `${dbPath}-shm`].forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  })
}

/**
 * Create a v1 database schema (before migration)
 * Used for testing migration from v1 to v2
 */
export function createV1Schema(db: Database.Database) {
  // V1 schema without new columns/tables
  db.exec(`
    -- Notes table (unchanged in v2)
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      cardIds TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Cards table (v1 - missing cardType, parentListId, listPosition)
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      noteId TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
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

    -- Review logs (v1 - missing responseTimeMs, partialCreditScore)
    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      cardId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      state INTEGER NOT NULL,
      reviewedAt TEXT NOT NULL,
      FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE
    );

    -- Set schema version to 1
    PRAGMA user_version = 1;
  `)
}

/**
 * Create a v2 database schema (current)
 */
export function createV2Schema(db: Database.Database) {
  // This should match the schema in database.ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      cardIds TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      noteId TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      cardType TEXT DEFAULT 'qa',
      parentListId TEXT,
      listPosition INTEGER,
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

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      cardId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      state INTEGER NOT NULL,
      reviewedAt TEXT NOT NULL,
      responseTimeMs INTEGER,
      partialCreditScore REAL,
      FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quick_dumps (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      processedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      sourceNoteId TEXT NOT NULL,
      targetNoteId TEXT NOT NULL,
      semanticScore REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (sourceNoteId) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (targetNoteId) REFERENCES notes(id) ON DELETE CASCADE
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_quick_dumps_status ON quick_dumps(status);
    CREATE INDEX IF NOT EXISTS idx_cards_cardType ON cards(cardType);
    CREATE INDEX IF NOT EXISTS idx_cards_parentListId ON cards(parentListId);
    CREATE INDEX IF NOT EXISTS idx_connections_sourceNoteId ON connections(sourceNoteId);
    CREATE INDEX IF NOT EXISTS idx_connections_targetNoteId ON connections(targetNoteId);

    PRAGMA user_version = 2;
  `)
}

/**
 * Create a v3 database schema (current with 3-layer architecture)
 */
export function createV3Schema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      cardIds TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      noteId TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      cardType TEXT DEFAULT 'qa',
      parentListId TEXT,
      listPosition INTEGER,
      notebookTopicPageId TEXT,
      sourceBlockId TEXT,
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

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      cardId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      state INTEGER NOT NULL,
      reviewedAt TEXT NOT NULL,
      responseTimeMs INTEGER,
      partialCreditScore REAL,
      FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quick_dumps (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      processedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      sourceNoteId TEXT NOT NULL,
      targetNoteId TEXT NOT NULL,
      semanticScore REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (sourceNoteId) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (targetNoteId) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS source_items (
      id TEXT PRIMARY KEY,
      sourceType TEXT NOT NULL,
      sourceName TEXT NOT NULL,
      sourceUrl TEXT,
      title TEXT NOT NULL,
      rawContent TEXT NOT NULL,
      mediaPath TEXT,
      transcription TEXT,
      canonicalTopicIds TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      questionId TEXT,
      status TEXT NOT NULL DEFAULT 'inbox',
      createdAt TEXT NOT NULL,
      processedAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS canonical_topics (
      id TEXT PRIMARY KEY,
      canonicalName TEXT NOT NULL UNIQUE,
      aliases TEXT NOT NULL DEFAULT '[]',
      domain TEXT NOT NULL,
      parentTopicId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (parentTopicId) REFERENCES canonical_topics(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS notebook_topic_pages (
      id TEXT PRIMARY KEY,
      canonicalTopicId TEXT NOT NULL,
      cardIds TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (canonicalTopicId) REFERENCES canonical_topics(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS notebook_blocks (
      id TEXT PRIMARY KEY,
      notebookTopicPageId TEXT NOT NULL,
      sourceItemId TEXT NOT NULL,
      content TEXT NOT NULL,
      annotations TEXT,
      mediaPath TEXT,
      position INTEGER NOT NULL,
      FOREIGN KEY (notebookTopicPageId) REFERENCES notebook_topic_pages(id) ON DELETE RESTRICT,
      FOREIGN KEY (sourceItemId) REFERENCES source_items(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS smart_views (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      filter TEXT NOT NULL DEFAULT '{}',
      sortBy TEXT NOT NULL,
      isSystem INTEGER NOT NULL DEFAULT 0
    );

    -- v2 Indexes
    CREATE INDEX IF NOT EXISTS idx_quick_dumps_status ON quick_dumps(status);
    CREATE INDEX IF NOT EXISTS idx_cards_cardType ON cards(cardType);
    CREATE INDEX IF NOT EXISTS idx_cards_parentListId ON cards(parentListId);
    CREATE INDEX IF NOT EXISTS idx_connections_sourceNoteId ON connections(sourceNoteId);
    CREATE INDEX IF NOT EXISTS idx_connections_targetNoteId ON connections(targetNoteId);

    -- v3 Indexes
    CREATE INDEX IF NOT EXISTS idx_source_items_status ON source_items(status);
    CREATE INDEX IF NOT EXISTS idx_source_items_sourceType ON source_items(sourceType);
    CREATE INDEX IF NOT EXISTS idx_canonical_topics_domain ON canonical_topics(domain);
    CREATE INDEX IF NOT EXISTS idx_notebook_blocks_page ON notebook_blocks(notebookTopicPageId);
    CREATE INDEX IF NOT EXISTS idx_cards_notebook_page ON cards(notebookTopicPageId);

    PRAGMA user_version = 3;
  `)
}

/**
 * Insert sample v1 data for migration testing
 */
export function insertV1SampleData(db: Database.Database) {
  const now = new Date().toISOString()
  
  // Insert note
  db.prepare(`
    INSERT INTO notes (id, title, content, tags, cardIds, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('note-1', 'Heart Failure', 'Causes of HF', '["cardiology"]', '["card-1"]', now, now)
  
  // Insert card (v1 format - no cardType, parentListId, listPosition)
  db.prepare(`
    INSERT INTO cards (id, front, back, noteId, tags, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('card-1', 'HOCM causes?', 'Genetic mutations', 'note-1', '["cardiology"]', 0, 0, 0, 0, 0, 0, 0, null, now, now)
  
  // Insert review log (v1 format - no responseTimeMs, partialCreditScore)
  db.prepare(`
    INSERT INTO review_logs (id, cardId, rating, state, reviewedAt)
    VALUES (?, ?, ?, ?, ?)
  `).run('log-1', 'card-1', 3, 1, now)
}

/**
 * Assert database has expected tables
 */
export function assertTablesExist(db: Database.Database, tables: string[]) {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all() as { name: string }[]
  
  const tableNames = result.map(r => r.name).sort()
  const expected = tables.sort()
  
  expect(tableNames).toEqual(expected)
}

/**
 * Assert database has expected indexes
 */
export function assertIndexesExist(db: Database.Database, indexes: string[]) {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'
  `).all() as { name: string }[]
  
  const indexNames = result.map(r => r.name).sort()
  const expected = indexes.sort()
  
  expect(indexNames).toEqual(expected)
}

/**
 * Assert column exists in table
 */
export function assertColumnExists(db: Database.Database, table: string, column: string) {
  const result = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  const columns = result.map(r => r.name)
  
  expect(columns).toContain(column)
}

/**
 * Get row count for a table
 */
export function getRowCount(db: Database.Database, table: string): number {
  const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }
  return result.count
}

/**
 * Create a minimal card for testing
 */
export function createMockCard(overrides: Partial<CardWithFSRS> = {}): CardWithFSRS {
  const now = new Date().toISOString()
  return {
    id: `card-${Date.now()}`,
    front: 'Test Question',
    back: 'Test Answer',
    noteId: 'note-1',
    tags: [],
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    lastReview: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Create a minimal note for testing
 */
export function createMockNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString()
  return {
    id: `note-${Date.now()}`,
    title: 'Test Note',
    content: 'Test content',
    tags: [],
    cardIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Create a minimal quick dump for testing
 */
export function createMockQuickDump(overrides: Partial<QuickDump> = {}): QuickDump {
  const now = new Date().toISOString()
  return {
    id: `dump-${Date.now()}`,
    content: 'Quick dump content',
    status: 'pending',
    createdAt: now,
    processedAt: null,
    ...overrides,
  }
}

/**
 * Create a minimal connection for testing
 */
export function createMockConnection(overrides: Partial<Connection> = {}): Connection {
  const now = new Date().toISOString()
  return {
    id: `conn-${Date.now()}`,
    sourceNoteId: 'note-1',
    targetNoteId: 'note-2',
    semanticScore: 0.85,
    createdAt: now,
    ...overrides,
  }
}

/**
 * Create a test source item (v3)
 */
export function createTestSourceItem(overrides: Partial<SourceItem> = {}): SourceItem {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    sourceType: 'quickcapture',
    sourceName: 'Quick Capture',
    title: 'Test Source Item',
    rawContent: 'Test content for source item',
    canonicalTopicIds: [],
    tags: [],
    status: 'inbox',
    createdAt: now,
    ...overrides,
  }
}

/**
 * Create a test canonical topic (v3)
 */
export function createTestCanonicalTopic(overrides: Partial<CanonicalTopic> = {}): CanonicalTopic {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    canonicalName: 'Test Topic',
    aliases: [],
    domain: 'internal-medicine',
    createdAt: now,
    ...overrides,
  }
}

/**
 * Create a test notebook topic page (v3)
 */
export function createTestNotebookPage(overrides: Partial<NotebookTopicPage> = {}): NotebookTopicPage {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    canonicalTopicId: 'topic-1', // Caller must provide valid ID
    cardIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Create a test notebook block (v3)
 */
export function createTestNotebookBlock(overrides: Partial<NotebookBlock> = {}): NotebookBlock {
  return {
    id: randomUUID(),
    notebookTopicPageId: 'page-1', // Caller must provide valid ID
    sourceItemId: 'source-1', // Caller must provide valid ID
    content: 'Test block content',
    position: 0,
    ...overrides,
  }
}
