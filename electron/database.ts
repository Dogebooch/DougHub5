import Database from 'better-sqlite3';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { createBackup, restoreBackup } from "./backup-service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Types (local to database layer, will sync with types/index.ts in Phase 4)
// ============================================================================

export type CardType = "standard" | "qa" | "cloze" | "vignette" | "list-cloze";
export type ExtractionStatus = "pending" | "processing" | "completed";

// v3 Architecture types
export type SourceType =
  | "qbank"
  | "article"
  | "pdf"
  | "image"
  | "audio"
  | "quickcapture"
  | "manual";
export type SourceItemStatus = "inbox" | "processed" | "curated";

export interface DbCard {
  id: string;
  front: string;
  back: string;
  noteId: string;
  tags: string[]; // Stored as JSON in DB
  dueDate: string;
  createdAt: string;
  // FSRS fields
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  lastReview: string | null;
  // Card type fields (v2)
  cardType: CardType;
  parentListId: string | null; // UUID for grouping medical list cards
  listPosition: number | null; // Order within list
}

export interface DbNote {
  id: string;
  title: string;
  content: string;
  cardIds: string[]; // Stored as JSON in DB
  tags: string[]; // Stored as JSON in DB
  createdAt: string;
}

export interface DbReviewLog {
  id: string;
  cardId: string;
  rating: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: number;
  scheduledDays: number;
  elapsedDays: number;
  review: string;
  createdAt: string;
  // Response tracking fields (v2)
  responseTimeMs: number | null; // Milliseconds to answer
  partialCreditScore: number | null; // 0.0-1.0 for list partial recall
}

export interface DbQuickCapture {
  id: string;
  content: string;
  extractionStatus: ExtractionStatus;
  createdAt: string;
  processedAt: string | null;
}

export interface DbConnection {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  semanticScore: number; // 0.0-1.0
  createdAt: string;
}

// v3 Architecture - Database interfaces
export interface DbSourceItem {
  id: string;
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
  title: string;
  rawContent: string;
  mediaPath?: string;
  tempImageData?: string;
  transcription?: string;
  canonicalTopicIds: string[];
  tags: string[];
  questionId?: string;
  status: SourceItemStatus;
  createdAt: string;
  processedAt?: string;
  updatedAt?: string;
}

export interface DbCanonicalTopic {
  id: string;
  canonicalName: string;
  aliases: string[];
  domain: string;
  parentTopicId?: string;
  createdAt: string;
}

export interface DbNotebookTopicPage {
  id: string;
  canonicalTopicId: string;
  cardIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DbNotebookBlock {
  id: string;
  notebookTopicPageId: string;
  sourceItemId: string;
  content: string;
  annotations?: string;
  mediaPath?: string;
  position: number;
  cardCount: number;
}

export interface DbMedicalAcronym {
  id?: number;
  acronym: string;
  expansion: string;
  category?: string;
}

export interface DbSmartView {
  id: string;
  name: string;
  icon: string;
  filter: {
    status?: string[];
    sourceType?: string[];
    topicIds?: string[];
    tags?: string[];
  };
  sortBy: string;
  isSystem: boolean;
}

// Raw row types (JSON fields are strings in SQLite)
interface CardRow {
  id: string;
  front: string;
  back: string;
  noteId: string;
  tags: string;
  dueDate: string;
  createdAt: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
  // Card type fields (v2)
  cardType: string | null;
  parentListId: string | null;
  listPosition: number | null;
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  cardIds: string;
  tags: string;
  createdAt: string;
}

interface ReviewLogRow {
  id: string;
  cardId: string;
  rating: number;
  state: number;
  scheduledDays: number;
  elapsedDays: number;
  review: string;
  createdAt: string;
  // Response tracking fields (v2)
  responseTimeMs: number | null;
  partialCreditScore: number | null;
}

interface QuickCaptureRow {
  id: string;
  content: string;
  extractionStatus: string;
  createdAt: string;
  processedAt: string | null;
}

interface ConnectionRow {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  semanticScore: number;
  createdAt: string;
}

// v3 Architecture - Row types (JSON fields as strings)
interface SourceItemRow {
  id: string;
  sourceType: string;
  sourceName: string;
  sourceUrl: string | null;
  title: string;
  rawContent: string;
  mediaPath: string | null;
  transcription: string | null;
  canonicalTopicIds: string; // JSON
  tags: string; // JSON
  questionId: string | null;
  status: string;
  createdAt: string;
  processedAt: string | null;
  updatedAt: string | null;
}

interface CanonicalTopicRow {
  id: string;
  canonicalName: string;
  aliases: string; // JSON
  domain: string;
  parentTopicId: string | null;
  createdAt: string;
}

interface NotebookTopicPageRow {
  id: string;
  canonicalTopicId: string;
  cardIds: string; // JSON
  createdAt: string;
  updatedAt: string;
}

interface NotebookBlockRow {
  id: string;
  notebookTopicPageId: string;
  sourceItemId: string;
  content: string;
  annotations: string | null;
  mediaPath: string | null;
  position: number;
  cardCount: number;
}

interface SmartViewRow {
  id: string;
  name: string;
  icon: string;
  filter: string; // JSON
  sortBy: string;
  isSystem: number; // SQLite INTEGER for boolean
}

// ============================================================================
// Database Initialization
// ============================================================================

let db: Database.Database | null = null;
let currentDbPath: string | null = null;

/**
 * Get current schema version from user_version pragma.
 */
function getSchemaVersion(): number {
  return getDatabase().pragma("user_version", { simple: true }) as number;
}

/**
 * Set schema version via user_version pragma.
 */
function setSchemaVersion(version: number): void {
  getDatabase().pragma(`user_version = ${version}`);
}

/**
 * Check if a column exists in a table.
 */
function columnExists(table: string, column: string): boolean {
  const columns = getDatabase()
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

/**
 * Check if a table exists in the database.
 */
function tableExists(table: string): boolean {
  const result = getDatabase()
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table) as { name: string } | undefined;
  return result !== undefined;
}

/**
 * Migrate database from v1 to v2.
 * Creates backup before migration, restores on failure.
 */
function migrateToV2(dbPath: string): void {
  console.log("[Migration] Starting migration to schema version 2...");

  // Backup before migration
  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      // Cards table extensions
      if (!columnExists("cards", "cardType")) {
        database.exec(
          "ALTER TABLE cards ADD COLUMN cardType TEXT DEFAULT 'standard'"
        );
        console.log("[Migration] Added cards.cardType column");
      }
      if (!columnExists("cards", "parentListId")) {
        database.exec("ALTER TABLE cards ADD COLUMN parentListId TEXT");
        console.log("[Migration] Added cards.parentListId column");
      }
      if (!columnExists("cards", "listPosition")) {
        database.exec("ALTER TABLE cards ADD COLUMN listPosition INTEGER");
        console.log("[Migration] Added cards.listPosition column");
      }

      // Review logs extensions
      if (!columnExists("review_logs", "responseTimeMs")) {
        database.exec(
          "ALTER TABLE review_logs ADD COLUMN responseTimeMs INTEGER"
        );
        console.log("[Migration] Added review_logs.responseTimeMs column");
      }
      if (!columnExists("review_logs", "partialCreditScore")) {
        database.exec(
          "ALTER TABLE review_logs ADD COLUMN partialCreditScore REAL"
        );
        console.log("[Migration] Added review_logs.partialCreditScore column");
      }

      // Quick captures table (legacy quick_dumps for backward compatibility)
      if (!tableExists("quick_dumps")) {
        database.exec(`
          CREATE TABLE quick_dumps (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            extractionStatus TEXT NOT NULL DEFAULT 'pending',
            createdAt TEXT NOT NULL,
            processedAt TEXT
          )
        `);
        database.exec(
          `CREATE INDEX idx_quick_dumps_status ON quick_dumps(extractionStatus)`
        );
        console.log("[Migration] Created quick_dumps table");
      }

      // Connections table
      if (!tableExists("connections")) {
        database.exec(`
          CREATE TABLE connections (
            id TEXT PRIMARY KEY,
            sourceNoteId TEXT NOT NULL,
            targetNoteId TEXT NOT NULL,
            semanticScore REAL NOT NULL,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (sourceNoteId) REFERENCES notes(id) ON DELETE CASCADE,
            FOREIGN KEY (targetNoteId) REFERENCES notes(id) ON DELETE CASCADE
          )
        `);
        database.exec(
          `CREATE INDEX idx_connections_sourceNoteId ON connections(sourceNoteId)`
        );
        database.exec(
          `CREATE INDEX idx_connections_targetNoteId ON connections(targetNoteId)`
        );
        database.exec(
          `CREATE INDEX idx_connections_semanticScore ON connections(semanticScore)`
        );
        console.log("[Migration] Created connections table");
      }

      // Cards indexes
      database.exec(
        `CREATE INDEX IF NOT EXISTS idx_cards_cardType ON cards(cardType)`
      );
      database.exec(
        `CREATE INDEX IF NOT EXISTS idx_cards_parentListId ON cards(parentListId)`
      );

      setSchemaVersion(2);
    })();

    console.log("[Migration] Successfully migrated to schema version 2");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    // Close database before restore
    database.close();
    db = null;
    restoreBackup(backupPath, dbPath);
    // Re-open database after restore
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    throw error;
  }
}

/**
 * Migrate database from v2 to v3.
 * Adds 3-layer architecture: Knowledge Bank → Notebook → Cards.
 * Creates backup before migration, restores on failure.
 */
function migrateToV3(dbPath: string): void {
  console.log("[Migration] Starting migration to schema version 3...");

  // Backup before migration
  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      // Create source_items table (Knowledge Bank layer)
      if (!tableExists("source_items")) {
        database.exec(`
          CREATE TABLE source_items (
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
          )
        `);
        console.log("[Migration] Created source_items table");
      }

      // Create canonical_topics table
      if (!tableExists("canonical_topics")) {
        database.exec(`
          CREATE TABLE canonical_topics (
            id TEXT PRIMARY KEY,
            canonicalName TEXT NOT NULL UNIQUE,
            aliases TEXT NOT NULL DEFAULT '[]',
            domain TEXT NOT NULL,
            parentTopicId TEXT,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (parentTopicId) REFERENCES canonical_topics(id) ON DELETE RESTRICT
          )
        `);
        console.log("[Migration] Created canonical_topics table");
      }

      // Create notebook_topic_pages table (Notebook layer)
      if (!tableExists("notebook_topic_pages")) {
        database.exec(`
          CREATE TABLE notebook_topic_pages (
            id TEXT PRIMARY KEY,
            canonicalTopicId TEXT NOT NULL,
            cardIds TEXT NOT NULL DEFAULT '[]',
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            FOREIGN KEY (canonicalTopicId) REFERENCES canonical_topics(id) ON DELETE RESTRICT
          )
        `);
        console.log("[Migration] Created notebook_topic_pages table");
      }

      // Create notebook_blocks table
      if (!tableExists("notebook_blocks")) {
        database.exec(`
          CREATE TABLE notebook_blocks (
            id TEXT PRIMARY KEY,
            notebookTopicPageId TEXT NOT NULL,
            sourceItemId TEXT NOT NULL,
            content TEXT NOT NULL,
            annotations TEXT,
            mediaPath TEXT,
            position INTEGER NOT NULL,
            FOREIGN KEY (notebookTopicPageId) REFERENCES notebook_topic_pages(id) ON DELETE RESTRICT,
            FOREIGN KEY (sourceItemId) REFERENCES source_items(id) ON DELETE RESTRICT
          )
        `);
        console.log("[Migration] Created notebook_blocks table");
      }

      // Create smart_views table
      if (!tableExists("smart_views")) {
        database.exec(`
          CREATE TABLE smart_views (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT NOT NULL,
            filter TEXT NOT NULL DEFAULT '{}',
            sortBy TEXT NOT NULL,
            isSystem INTEGER NOT NULL DEFAULT 0
          )
        `);
        console.log("[Migration] Created smart_views table");
      }

      // Alter cards table to add notebook linking fields
      if (!columnExists("cards", "notebookTopicPageId")) {
        database.exec("ALTER TABLE cards ADD COLUMN notebookTopicPageId TEXT");
        console.log("[Migration] Added cards.notebookTopicPageId column");
      }
      if (!columnExists("cards", "sourceBlockId")) {
        database.exec("ALTER TABLE cards ADD COLUMN sourceBlockId TEXT");
        console.log("[Migration] Added cards.sourceBlockId column");
      }

      // Create indexes
      database.exec(
        `CREATE INDEX IF NOT EXISTS idx_source_items_status ON source_items(status)`
      );
      database.exec(
        `CREATE INDEX IF NOT EXISTS idx_source_items_sourceType ON source_items(sourceType)`
      );
      database.exec(
        `CREATE INDEX IF NOT EXISTS idx_canonical_topics_domain ON canonical_topics(domain)`
      );
      database.exec(
        `CREATE INDEX IF NOT EXISTS idx_notebook_blocks_page ON notebook_blocks(notebookTopicPageId)`
      );
      database.exec(
        `CREATE INDEX IF NOT EXISTS idx_cards_notebook_page ON cards(notebookTopicPageId)`
      );
      console.log("[Migration] Created v3 indexes");

      // Migrate existing quick_dumps to source_items
      if (tableExists("quick_dumps")) {
        const quickDumps = database
          .prepare("SELECT * FROM quick_dumps")
          .all() as Array<{
          id: string;
          content: string;
          extractionStatus: string;
          createdAt: string;
          processedAt: string | null;
        }>;

        if (quickDumps.length > 0) {
          const insertStmt = database.prepare(`
            INSERT INTO source_items (
              id, sourceType, sourceName, title, rawContent, 
              canonicalTopicIds, tags, status, createdAt, processedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const dump of quickDumps) {
            // Map extractionStatus to SourceItemStatus
            let status: string;
            if (dump.extractionStatus === "completed") {
              status = "processed";
            } else {
              // 'pending' or 'processing' → 'inbox'
              status = "inbox";
            }

            // Use first 50 chars of content as title
            const title =
              dump.content.substring(0, 50).trim() +
              (dump.content.length > 50 ? "..." : "");

            insertStmt.run(
              dump.id,
              "quickcapture",
              "Quick Capture",
              title,
              dump.content,
              "[]", // empty canonicalTopicIds
              "[]", // empty tags
              status,
              dump.createdAt,
              dump.processedAt
            );
          }

          console.log(
            `[Migration] Migrated ${quickDumps.length} quick_dumps to source_items`
          );
        }
      }

      setSchemaVersion(3);
    })();

    console.log("[Migration] Successfully migrated to schema version 3");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    // Close database before restore
    database.close();
    db = null;
    restoreBackup(backupPath, dbPath);
    // Re-open database after restore
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    throw error;
  }
}

/**
 * Migrate database from v3 to v4.
 * Adds FTS5 full-text search tables and sync triggers.
 * Creates backup before migration, restores on failure.
 */
function migrateToV4(dbPath: string): void {
  console.log("[Migration] Starting migration to schema version 4 (FTS5)...");

  const backupPath = createBackup(dbPath);
  console.log(`[Migration] Backup created: ${backupPath}`);

  const database = getDatabase();

  try {
    database.transaction(() => {
      // Create FTS5 virtual tables
      database.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
          id UNINDEXED, front, back, tags,
          content=cards, content_rowid=rowid
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
          id UNINDEXED, title, content, tags,
          content=notes, content_rowid=rowid
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS source_items_fts USING fts5(
          id UNINDEXED, title, rawContent, sourceName, tags,
          content=source_items, content_rowid=rowid
        );
      `);
      console.log("[Migration] Created FTS5 virtual tables with tags");

      // Cards FTS triggers
      database.exec(`
        CREATE TRIGGER IF NOT EXISTS cards_fts_insert AFTER INSERT ON cards BEGIN
          INSERT INTO cards_fts(rowid, id, front, back, tags)
          VALUES (NEW.rowid, NEW.id, NEW.front, NEW.back, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS cards_fts_update AFTER UPDATE ON cards BEGIN
          INSERT INTO cards_fts(cards_fts, rowid, id, front, back, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.front, OLD.back, OLD.tags);
          INSERT INTO cards_fts(rowid, id, front, back, tags)
          VALUES (NEW.rowid, NEW.id, NEW.front, NEW.back, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS cards_fts_delete AFTER DELETE ON cards BEGIN
          INSERT INTO cards_fts(cards_fts, rowid, id, front, back, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.front, OLD.back, OLD.tags);
        END;
      `);
      console.log("[Migration] Created cards_fts triggers");

      // Notes FTS triggers
      database.exec(`
        CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
          INSERT INTO notes_fts(rowid, id, title, content, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.content, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
          INSERT INTO notes_fts(notes_fts, rowid, id, title, content, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.content, OLD.tags);
          INSERT INTO notes_fts(rowid, id, title, content, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.content, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
          INSERT INTO notes_fts(notes_fts, rowid, id, title, content, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.content, OLD.tags);
        END;
      `);
      console.log("[Migration] Created notes_fts triggers");

      // Source items FTS triggers
      database.exec(`
        CREATE TRIGGER IF NOT EXISTS source_items_fts_insert AFTER INSERT ON source_items BEGIN
          INSERT INTO source_items_fts(rowid, id, title, rawContent, sourceName, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.rawContent, NEW.sourceName, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS source_items_fts_update AFTER UPDATE ON source_items BEGIN
          INSERT INTO source_items_fts(source_items_fts, rowid, id, title, rawContent, sourceName, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.rawContent, OLD.sourceName, OLD.tags);
          INSERT INTO source_items_fts(rowid, id, title, rawContent, sourceName, tags)
          VALUES (NEW.rowid, NEW.id, NEW.title, NEW.rawContent, NEW.sourceName, NEW.tags);
        END;
        CREATE TRIGGER IF NOT EXISTS source_items_fts_delete AFTER DELETE ON source_items BEGIN
          INSERT INTO source_items_fts(source_items_fts, rowid, id, title, rawContent, sourceName, tags)
          VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.rawContent, OLD.sourceName, OLD.tags);
        END;
      `);
      console.log("[Migration] Created source_items_fts triggers");

      // Populate FTS tables with existing data
      database.exec(`
        INSERT INTO cards_fts(rowid, id, front, back, tags)
        SELECT rowid, id, front, back, tags FROM cards;
        INSERT INTO notes_fts(rowid, id, title, content, tags)
        SELECT rowid, id, title, content, tags FROM notes;
        INSERT INTO source_items_fts(rowid, id, title, rawContent, sourceName, tags)
        SELECT rowid, id, title, rawContent, sourceName, tags FROM source_items;
      `);
      console.log("[Migration] Populated FTS tables with existing data");

      setSchemaVersion(4);
    })();

    console.log("[Migration] Successfully migrated to schema version 4");
  } catch (error) {
    console.error("[Migration] Failed, restoring backup:", error);
    database.close();
    db = null;
    restoreBackup(backupPath, dbPath);
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    throw error;
  }
}

/**
 * Migrate database from v4 to v5.
 * Adds medical_acronyms table for robust terminology expansion.
 */
function migrateToV5(dbPath: string): void {
  console.log(
    "[Migration] Starting migration to schema version 5 (Acronyms)..."
  );

  const database = getDatabase();

  try {
    database.transaction(() => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS medical_acronyms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          acronym TEXT NOT NULL,
          expansion TEXT NOT NULL,
          category TEXT,
          UNIQUE(acronym, expansion)
        );
        CREATE INDEX IF NOT EXISTS idx_medical_acronyms_lookup ON medical_acronyms(acronym);
      `);
      console.log("[Migration] Created medical_acronyms table and indexes");
      setSchemaVersion(5);
    })();

    console.log("[Migration] Successfully migrated to schema version 5");
  } catch (error) {
    console.error("[Migration] Failed migration to v5:", error);
    throw error;
  }
}

/**
 * Initialize the SQLite database.
 * Call this from main.ts after app.whenReady().
 *
 * @param dbPath - Full path to database file (use app.getPath('userData') + '/doughub.db')
 * @returns The Database instance
 */
export function initDatabase(dbPath: string): Database.Database {
  if (db) {
    return db;
  }

  db = new Database(dbPath);
  currentDbPath = dbPath;

  // Enable WAL mode for better performance
  db.pragma("journal_mode = WAL");

  // Enable foreign key constraints
  db.pragma("foreign_keys = ON");

  // Check current schema version
  const version = getSchemaVersion();
  console.log(`[Database] Current schema version: ${version}`);

  // Initial schema (version 0 - fresh database)
  if (version === 0) {
    console.log("[Database] Creating initial schema (v1)...");

    // Create tables
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
        createdAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cards_noteId ON cards(noteId);
      CREATE INDEX IF NOT EXISTS idx_cards_dueDate ON cards(dueDate);
      CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
      CREATE INDEX IF NOT EXISTS idx_review_logs_cardId ON review_logs(cardId);
    `);

    setSchemaVersion(1);
    console.log("[Database] Initial schema created (v1)");
  }

  // Migration to v2
  if (getSchemaVersion() < 2) {
    migrateToV2(dbPath);
  }

  // Migration to v3
  if (getSchemaVersion() < 3) {
    migrateToV3(dbPath);
  }

  // Migration to v4 (FTS5 search)
  if (getSchemaVersion() < 4) {
    migrateToV4(dbPath);
  }

  // Migration to v5 (Medical Acronyms)
  if (getSchemaVersion() < 5) {
    migrateToV5(dbPath);
  }

  // Seed system smart views (v3)
  if (getSchemaVersion() >= 3) {
    seedSystemSmartViews();
  }

  // Seed medical acronyms (v5)
  if (getSchemaVersion() >= 5) {
    seedMedicalAcronymsFromLocalFile();
  }

  return db;
}

/**
 * Get the database instance. Throws if not initialized.
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    currentDbPath = null;
  }
}

/**
 * Get the current database path.
 */
export function getDbPath(): string | null {
  return currentDbPath;
}

// ============================================================================
// Card Queries
// ============================================================================

export const cardQueries = {
  getAll(): DbCard[] {
    const stmt = getDatabase().prepare("SELECT * FROM cards");
    const rows = stmt.all() as CardRow[];
    return rows.map(parseCardRow);
  },

  insert(card: DbCard): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO cards (
        id, front, back, noteId, tags, dueDate, createdAt,
        stability, difficulty, elapsedDays, scheduledDays,
        reps, lapses, state, lastReview,
        cardType, parentListId, listPosition
      ) VALUES (
        @id, @front, @back, @noteId, @tags, @dueDate, @createdAt,
        @stability, @difficulty, @elapsedDays, @scheduledDays,
        @reps, @lapses, @state, @lastReview,
        @cardType, @parentListId, @listPosition
      )
    `);
    stmt.run({
      ...card,
      tags: JSON.stringify(card.tags),
    });
  },

  update(id: string, updates: Partial<DbCard>): void {
    const current = cardQueries.getAll().find((c) => c.id === id);
    if (!current) {
      throw new Error(`Card not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE cards SET
        front = @front,
        back = @back,
        noteId = @noteId,
        tags = @tags,
        dueDate = @dueDate,
        createdAt = @createdAt,
        stability = @stability,
        difficulty = @difficulty,
        elapsedDays = @elapsedDays,
        scheduledDays = @scheduledDays,
        reps = @reps,
        lapses = @lapses,
        state = @state,
        lastReview = @lastReview,
        cardType = @cardType,
        parentListId = @parentListId,
        listPosition = @listPosition
      WHERE id = @id
    `);
    stmt.run({
      ...merged,
      tags: JSON.stringify(merged.tags),
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare("DELETE FROM cards WHERE id = @id");
    stmt.run({ id });
  },
};

function parseCardRow(row: CardRow): DbCard {
  return {
    ...row,
    tags: JSON.parse(row.tags),
    cardType: (row.cardType as CardType) || "standard",
    parentListId: row.parentListId,
    listPosition: row.listPosition,
  };
}

// ============================================================================
// Note Queries
// ============================================================================

export const noteQueries = {
  getAll(): DbNote[] {
    const stmt = getDatabase().prepare("SELECT * FROM notes");
    const rows = stmt.all() as NoteRow[];
    return rows.map(parseNoteRow);
  },

  insert(note: DbNote): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO notes (id, title, content, cardIds, tags, createdAt)
      VALUES (@id, @title, @content, @cardIds, @tags, @createdAt)
    `);
    stmt.run({
      ...note,
      cardIds: JSON.stringify(note.cardIds),
      tags: JSON.stringify(note.tags),
    });
  },

  update(id: string, updates: Partial<DbNote>): void {
    const current = noteQueries.getAll().find((n) => n.id === id);
    if (!current) {
      throw new Error(`Note not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE notes SET
        title = @title,
        content = @content,
        cardIds = @cardIds,
        tags = @tags,
        createdAt = @createdAt
      WHERE id = @id
    `);
    stmt.run({
      ...merged,
      cardIds: JSON.stringify(merged.cardIds),
      tags: JSON.stringify(merged.tags),
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare("DELETE FROM notes WHERE id = @id");
    stmt.run({ id });
  },
};

function parseNoteRow(row: NoteRow): DbNote {
  return {
    ...row,
    cardIds: JSON.parse(row.cardIds),
    tags: JSON.parse(row.tags),
  };
}

// ============================================================================
// Review Log Queries (append-only)
// ============================================================================

export const reviewLogQueries = {
  getAll(): DbReviewLog[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM review_logs ORDER BY createdAt DESC"
    );
    const rows = stmt.all() as ReviewLogRow[];
    return rows.map(parseReviewLogRow);
  },

  insert(log: DbReviewLog): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO review_logs (
        id, cardId, rating, state, scheduledDays, elapsedDays, review, createdAt,
        responseTimeMs, partialCreditScore
      ) VALUES (
        @id, @cardId, @rating, @state, @scheduledDays, @elapsedDays, @review, @createdAt,
        @responseTimeMs, @partialCreditScore
      )
    `);
    stmt.run(log);
  },
};

function parseReviewLogRow(row: ReviewLogRow): DbReviewLog {
  return {
    ...row,
    responseTimeMs: row.responseTimeMs,
    partialCreditScore: row.partialCreditScore,
  };
}

// ============================================================================
// Quick Capture Queries
// ============================================================================

function mapSourceToQuickCapture(item: DbSourceItem): DbQuickCapture {
  let extractionStatus: ExtractionStatus = "pending";
  if (item.status === "processed" || item.status === "curated") {
    extractionStatus = "completed";
  }

  return {
    id: item.id,
    content: item.rawContent,
    extractionStatus,
    createdAt: item.createdAt,
    processedAt: item.processedAt || null,
  };
}

export const quickCaptureQueries = {
  getAll(): DbQuickCapture[] {
    const items = sourceItemQueries.getByType("quickcapture");
    return items.map(mapSourceToQuickCapture);
  },

  getByStatus(status: ExtractionStatus): DbQuickCapture[] {
    const items = sourceItemQueries.getByType("quickcapture").filter((item) => {
      const qd = mapSourceToQuickCapture(item);
      return qd.extractionStatus === status;
    });
    return items.map(mapSourceToQuickCapture);
  },

  insert(capture: DbQuickCapture): void {
    const title =
      capture.content.substring(0, 50).trim() +
      (capture.content.length > 50 ? "..." : "");

    const sourceItem: DbSourceItem = {
      id: capture.id,
      sourceType: "quickcapture",
      sourceName: "Quick Capture",
      title: title,
      rawContent: capture.content,
      canonicalTopicIds: [],
      tags: [],
      status: capture.extractionStatus === "completed" ? "processed" : "inbox",
      createdAt: capture.createdAt,
      processedAt: capture.processedAt || undefined,
      updatedAt: capture.createdAt,
    };
    sourceItemQueries.insert(sourceItem);
  },

  update(id: string, updates: Partial<DbQuickCapture>): void {
    const current = sourceItemQueries.getById(id);
    if (!current || current.sourceType !== "quickcapture") {
      throw new Error(`Quick capture not found: ${id}`);
    }

    const sourceUpdates: Partial<DbSourceItem> = {};
    if (updates.content !== undefined) {
      sourceUpdates.rawContent = updates.content;
      sourceUpdates.title =
        updates.content.substring(0, 50).trim() +
        (updates.content.length > 50 ? "..." : "");
    }
    if (updates.extractionStatus !== undefined) {
      sourceUpdates.status =
        updates.extractionStatus === "completed" ? "processed" : "inbox";
    }
    if (updates.processedAt !== undefined) {
      sourceUpdates.processedAt = updates.processedAt || undefined;
    }

    sourceUpdates.updatedAt = new Date().toISOString();

    sourceItemQueries.update(id, sourceUpdates);
  },

  delete(id: string): void {
    sourceItemQueries.delete(id);
  },
};

function parseQuickCaptureRow(row: QuickCaptureRow): DbQuickCapture {
  return {
    ...row,
    extractionStatus: row.extractionStatus as ExtractionStatus,
  };
}

// ============================================================================
// Connection Queries
// ============================================================================

export const connectionQueries = {
  getAll(): DbConnection[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM connections ORDER BY semanticScore DESC"
    );
    const rows = stmt.all() as ConnectionRow[];
    return rows;
  },

  getBySourceNote(noteId: string): DbConnection[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM connections WHERE sourceNoteId = ? ORDER BY semanticScore DESC"
    );
    const rows = stmt.all(noteId) as ConnectionRow[];
    return rows;
  },

  getByTargetNote(noteId: string): DbConnection[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM connections WHERE targetNoteId = ? ORDER BY semanticScore DESC"
    );
    const rows = stmt.all(noteId) as ConnectionRow[];
    return rows;
  },

  insert(connection: DbConnection): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO connections (id, sourceNoteId, targetNoteId, semanticScore, createdAt)
      VALUES (@id, @sourceNoteId, @targetNoteId, @semanticScore, @createdAt)
    `);
    stmt.run(connection);
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM connections WHERE id = @id"
    );
    stmt.run({ id });
  },
};

// ============================================================================
// v3 Architecture - Source Item Queries
// ============================================================================

export const sourceItemQueries = {
  getAll(): DbSourceItem[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items ORDER BY createdAt DESC"
    );
    const rows = stmt.all() as SourceItemRow[];
    return rows.map(parseSourceItemRow);
  },

  getByStatus(status: SourceItemStatus): DbSourceItem[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE status = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(status) as SourceItemRow[];
    return rows.map(parseSourceItemRow);
  },

  getByType(type: SourceType): DbSourceItem[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE sourceType = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(type) as SourceItemRow[];
    return rows.map(parseSourceItemRow);
  },

  getById(id: string): DbSourceItem | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE id = ?"
    );
    const row = stmt.get(id) as SourceItemRow | undefined;
    return row ? parseSourceItemRow(row) : null;
  },

  insert(item: DbSourceItem): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO source_items (
        id, sourceType, sourceName, sourceUrl, title, rawContent,
        mediaPath, transcription, canonicalTopicIds, tags, questionId,
        status, createdAt, processedAt, updatedAt
      ) VALUES (
        @id, @sourceType, @sourceName, @sourceUrl, @title, @rawContent,
        @mediaPath, @transcription, @canonicalTopicIds, @tags, @questionId,
        @status, @createdAt, @processedAt, @updatedAt
      )
    `);
    stmt.run({
      id: item.id,
      sourceType: item.sourceType,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl || null,
      title: item.title,
      rawContent: item.rawContent,
      mediaPath: item.mediaPath || null,
      transcription: item.transcription || null,
      questionId: item.questionId || null,
      status: item.status,
      createdAt: item.createdAt,
      processedAt: item.processedAt || null,
      updatedAt: item.updatedAt || null,
      canonicalTopicIds: JSON.stringify(item.canonicalTopicIds),
      tags: JSON.stringify(item.tags),
    });
  },

  update(id: string, updates: Partial<DbSourceItem>): void {
    const current = sourceItemQueries.getById(id);
    if (!current) {
      throw new Error(`SourceItem not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE source_items SET
        sourceType = @sourceType,
        sourceName = @sourceName,
        sourceUrl = @sourceUrl,
        title = @title,
        rawContent = @rawContent,
        mediaPath = @mediaPath,
        transcription = @transcription,
        canonicalTopicIds = @canonicalTopicIds,
        tags = @tags,
        questionId = @questionId,
        status = @status,
        createdAt = @createdAt,
        processedAt = @processedAt,
        updatedAt = @updatedAt
      WHERE id = @id
    `);
    stmt.run({
      id: merged.id,
      sourceType: merged.sourceType,
      sourceName: merged.sourceName,
      sourceUrl: merged.sourceUrl || null,
      title: merged.title,
      rawContent: merged.rawContent,
      mediaPath: merged.mediaPath || null,
      transcription: merged.transcription || null,
      questionId: merged.questionId || null,
      status: merged.status,
      createdAt: merged.createdAt,
      processedAt: merged.processedAt || null,
      updatedAt: merged.updatedAt || null,
      canonicalTopicIds: JSON.stringify(merged.canonicalTopicIds),
      tags: JSON.stringify(merged.tags),
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM source_items WHERE id = @id"
    );
    stmt.run({ id });
  },
};

function parseSourceItemRow(row: SourceItemRow): DbSourceItem {
  return {
    id: row.id,
    sourceType: row.sourceType as SourceType,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl || undefined,
    title: row.title,
    rawContent: row.rawContent,
    mediaPath: row.mediaPath || undefined,
    transcription: row.transcription || undefined,
    canonicalTopicIds: JSON.parse(row.canonicalTopicIds),
    tags: JSON.parse(row.tags),
    questionId: row.questionId || undefined,
    status: row.status as SourceItemStatus,
    createdAt: row.createdAt,
    processedAt: row.processedAt || undefined,
    updatedAt: row.updatedAt || undefined,
  };
}

// ============================================================================
// v3 Architecture - Canonical Topic Queries (Read-only)
// ============================================================================

export const canonicalTopicQueries = {
  getAll(): DbCanonicalTopic[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM canonical_topics ORDER BY canonicalName"
    );
    const rows = stmt.all() as CanonicalTopicRow[];
    return rows.map(parseCanonicalTopicRow);
  },

  getById(id: string): DbCanonicalTopic | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM canonical_topics WHERE id = ?"
    );
    const row = stmt.get(id) as CanonicalTopicRow | undefined;
    return row ? parseCanonicalTopicRow(row) : null;
  },

  getByDomain(domain: string): DbCanonicalTopic[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM canonical_topics WHERE domain = ? ORDER BY canonicalName"
    );
    const rows = stmt.all(domain) as CanonicalTopicRow[];
    return rows.map(parseCanonicalTopicRow);
  },

  insert(topic: DbCanonicalTopic): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO canonical_topics (id, canonicalName, aliases, domain, parentTopicId, createdAt)
      VALUES (@id, @canonicalName, @aliases, @domain, @parentTopicId, @createdAt)
    `);
    stmt.run({
      id: topic.id,
      canonicalName: topic.canonicalName,
      aliases: JSON.stringify(topic.aliases),
      domain: topic.domain,
      parentTopicId: topic.parentTopicId || null,
      createdAt: topic.createdAt,
    });
  },

  update(id: string, updates: Partial<DbCanonicalTopic>): void {
    const current = canonicalTopicQueries.getById(id);
    if (!current) {
      throw new Error(`CanonicalTopic not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE canonical_topics SET
        canonicalName = @canonicalName,
        aliases = @aliases,
        domain = @domain,
        parentTopicId = @parentTopicId,
        createdAt = @createdAt
      WHERE id = @id
    `);
    stmt.run({
      id: merged.id,
      canonicalName: merged.canonicalName,
      aliases: JSON.stringify(merged.aliases),
      domain: merged.domain,
      parentTopicId: merged.parentTopicId || null,
      createdAt: merged.createdAt,
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM canonical_topics WHERE id = @id"
    );
    stmt.run({ id });
  },
};

function parseCanonicalTopicRow(row: CanonicalTopicRow): DbCanonicalTopic {
  return {
    id: row.id,
    canonicalName: row.canonicalName,
    aliases: JSON.parse(row.aliases),
    domain: row.domain,
    parentTopicId: row.parentTopicId || undefined,
    createdAt: row.createdAt,
  };
}

// ============================================================================
// v3 Architecture - Notebook Topic Page Queries
// ============================================================================

export const notebookTopicPageQueries = {
  getAll(): DbNotebookTopicPage[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM notebook_topic_pages ORDER BY updatedAt DESC"
    );
    const rows = stmt.all() as NotebookTopicPageRow[];
    return rows.map(parseNotebookTopicPageRow);
  },

  getById(id: string): DbNotebookTopicPage | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM notebook_topic_pages WHERE id = ?"
    );
    const row = stmt.get(id) as NotebookTopicPageRow | undefined;
    return row ? parseNotebookTopicPageRow(row) : null;
  },

  insert(page: DbNotebookTopicPage): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO notebook_topic_pages (id, canonicalTopicId, cardIds, createdAt, updatedAt)
      VALUES (@id, @canonicalTopicId, @cardIds, @createdAt, @updatedAt)
    `);
    stmt.run({
      ...page,
      cardIds: JSON.stringify(page.cardIds),
    });
  },

  update(id: string, updates: Partial<DbNotebookTopicPage>): void {
    const current = notebookTopicPageQueries.getById(id);
    if (!current) {
      throw new Error(`NotebookTopicPage not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE notebook_topic_pages SET
        canonicalTopicId = @canonicalTopicId,
        cardIds = @cardIds,
        createdAt = @createdAt,
        updatedAt = @updatedAt
      WHERE id = @id
    `);
    stmt.run({
      ...merged,
      cardIds: JSON.stringify(merged.cardIds),
    });
  },
};

function parseNotebookTopicPageRow(
  row: NotebookTopicPageRow
): DbNotebookTopicPage {
  return {
    ...row,
    cardIds: JSON.parse(row.cardIds),
  };
}

// ============================================================================
// v3 Architecture - Notebook Block Queries
// ============================================================================

export const notebookBlockQueries = {
  getByPage(pageId: string): DbNotebookBlock[] {
    const stmt = getDatabase().prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      WHERE b.notebookTopicPageId = ? 
      ORDER BY b.position
    `);
    const rows = stmt.all(pageId) as NotebookBlockRow[];
    return rows.map(parseNotebookBlockRow);
  },

  insert(block: DbNotebookBlock): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO notebook_blocks (id, notebookTopicPageId, sourceItemId, content, annotations, mediaPath, position)
      VALUES (@id, @notebookTopicPageId, @sourceItemId, @content, @annotations, @mediaPath, @position)
    `);
    stmt.run({
      ...block,
      annotations: block.annotations || null,
      mediaPath: block.mediaPath || null,
    });
  },

  update(id: string, updates: Partial<DbNotebookBlock>): void {
    const stmt = getDatabase().prepare(
      "SELECT * FROM notebook_blocks WHERE id = ?"
    );
    const current = stmt.get(id) as NotebookBlockRow | undefined;
    if (!current) {
      throw new Error(`NotebookBlock not found: ${id}`);
    }

    const merged = { ...parseNotebookBlockRow(current), ...updates };
    const updateStmt = getDatabase().prepare(`
      UPDATE notebook_blocks SET
        notebookTopicPageId = @notebookTopicPageId,
        sourceItemId = @sourceItemId,
        content = @content,
        annotations = @annotations,
        mediaPath = @mediaPath,
        position = @position
      WHERE id = @id
    `);
    updateStmt.run({
      ...merged,
      annotations: merged.annotations || null,
      mediaPath: merged.mediaPath || null,
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM notebook_blocks WHERE id = @id"
    );
    stmt.run({ id });
  },
};

function parseNotebookBlockRow(row: NotebookBlockRow): DbNotebookBlock {
  return {
    id: row.id,
    notebookTopicPageId: row.notebookTopicPageId,
    sourceItemId: row.sourceItemId,
    content: row.content,
    annotations: row.annotations || undefined,
    mediaPath: row.mediaPath || undefined,
    position: row.position,
    cardCount: row.cardCount || 0,
  };
}

// ============================================================================
// v3 Architecture - Smart View Queries
// ============================================================================

export const smartViewQueries = {
  getAll(): DbSmartView[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM smart_views ORDER BY isSystem DESC, name"
    );
    const rows = stmt.all() as SmartViewRow[];
    return rows.map(parseSmartViewRow);
  },

  getSystemViews(): DbSmartView[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM smart_views WHERE isSystem = 1 ORDER BY name"
    );
    const rows = stmt.all() as SmartViewRow[];
    return rows.map(parseSmartViewRow);
  },

  getById(id: string): DbSmartView | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM smart_views WHERE id = ?"
    );
    const row = stmt.get(id) as SmartViewRow | undefined;
    return row ? parseSmartViewRow(row) : null;
  },

  update(id: string, updates: Partial<DbSmartView>): void {
    const current = smartViewQueries.getById(id);
    if (!current) {
      throw new Error(`SmartView not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE smart_views SET
        name = @name,
        icon = @icon,
        filter = @filter,
        sortBy = @sortBy,
        isSystem = @isSystem
      WHERE id = @id
    `);
    stmt.run({
      id: merged.id,
      name: merged.name,
      icon: merged.icon,
      filter: JSON.stringify(merged.filter),
      sortBy: merged.sortBy,
      isSystem: merged.isSystem ? 1 : 0,
    });
  },
};

function parseSmartViewRow(row: SmartViewRow): DbSmartView {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    filter: JSON.parse(row.filter),
    sortBy: row.sortBy,
    isSystem: row.isSystem === 1,
  };
}

// ============================================================================
// v3 Architecture - Seed System Smart Views
// ============================================================================

function seedSystemSmartViews(): void {
  const db = getDatabase();

  // Check if system views already exist
  const existingCount = (
    db
      .prepare("SELECT COUNT(*) as count FROM smart_views WHERE isSystem = 1")
      .get() as { count: number }
  ).count;

  if (existingCount > 0) {
    return; // Already seeded
  }

  console.log("[Database] Seeding system smart views...");

  const systemViews: Array<
    Omit<DbSmartView, "isSystem" | "filter"> & {
      isSystem: number;
      filter: string;
    }
  > = [
    {
      id: "system-inbox",
      name: "Inbox",
      icon: "inbox",
      filter: JSON.stringify({ status: ["inbox"] }),
      sortBy: "createdAt",
      isSystem: 1,
    },
    {
      id: "system-today",
      name: "Today",
      icon: "calendar",
      filter: JSON.stringify({}), // Filtered by dueDate in app layer
      sortBy: "dueDate",
      isSystem: 1,
    },
    {
      id: "system-queue",
      name: "Queue",
      icon: "list",
      filter: JSON.stringify({ status: ["processed"] }),
      sortBy: "processedAt",
      isSystem: 1,
    },
    {
      id: "system-notebook",
      name: "Notebook",
      icon: "book-open",
      filter: JSON.stringify({ status: ["curated"] }),
      sortBy: "updatedAt",
      isSystem: 1,
    },
    {
      id: "system-topics",
      name: "Topics",
      icon: "tags",
      filter: JSON.stringify({}),
      sortBy: "canonicalName",
      isSystem: 1,
    },
    {
      id: "system-stats",
      name: "Stats",
      icon: "bar-chart-3",
      filter: JSON.stringify({}),
      sortBy: "createdAt",
      isSystem: 1,
    },
    {
      id: "system-weak-topics",
      name: "Weak Topics",
      icon: "alert-triangle",
      filter: JSON.stringify({}), // Filtered by FSRS difficulty in app layer
      sortBy: "difficulty",
      isSystem: 1,
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO smart_views (id, name, icon, filter, sortBy, isSystem)
    VALUES (@id, @name, @icon, @filter, @sortBy, @isSystem)
  `);

  for (const view of systemViews) {
    stmt.run(view);
  }

  console.log(`[Database] Seeded ${systemViews.length} system smart views`);
}

/**
 * Seeds medical acronyms from a local JSON file or a default list.
 */
function seedMedicalAcronymsFromLocalFile(): void {
  const db = getDatabase();
  const count = db
    .prepare("SELECT COUNT(*) as count FROM medical_acronyms")
    .get() as { count: number };

  if (count.count > 0) {
    return; // Already seeded
  }

  console.log("[Database] Seeding medical acronyms...");

  let loadedAcronyms: any[] = [];

  // Try to load from local JSON file
  try {
    const possiblePaths = [
      path.join(process.cwd(), "src", "data", "medical-acronyms.json"),
      path.join(__dirname, "..", "src", "data", "medical-acronyms.json"),
      path.join(__dirname, "assets", "medical-acronyms.json"),
    ];

    let foundPath = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      const content = fs.readFileSync(foundPath, "utf8");
      loadedAcronyms = JSON.parse(content);
      console.log(
        `[Database] Loaded ${loadedAcronyms.length} acronyms from ${foundPath}`
      );
    }
  } catch (error) {
    console.warn(
      "[Database] Failed to load acronyms from file, using fallback list:",
      error
    );
  }

  // Fallback if file load failed or returned empty
  if (loadedAcronyms.length === 0) {
    loadedAcronyms = [
      { acronym: "HOCM", expansion: "Hypertrophic Obstructive Cardiomyopathy" },
      { acronym: "ADHF", expansion: "Acute Decompensated Heart Failure" },
      { acronym: "PUD", expansion: "Peptic Ulcer Disease" },
      { acronym: "DKA", expansion: "Diabetic Ketoacidosis" },
      { acronym: "CKD", expansion: "Chronic Kidney Disease" },
      { acronym: "ESRD", expansion: "End Stage Renal Disease" },
      { acronym: "COPD", expansion: "Chronic Obstructive Pulmonary Disease" },
      { acronym: "SLE", expansion: "Systemic Lupus Erythematosus" },
      { acronym: "GERD", expansion: "Gastroesophageal Reflux Disease" },
      {
        acronym: "NSTEMI",
        expansion: "Non-ST Elevation Myocardial Infarction",
      },
      { acronym: "STEMI", expansion: "ST Elevation Myocardial Infarction" },
      {
        acronym: "SIADH",
        expansion: "Syndrome of Inappropriate Antidiuretic Hormone",
      },
      {
        acronym: "TIPS",
        expansion: "Transjugular Intrahepatic Portosystemic Shunt",
      },
      { acronym: "DIC", expansion: "Disseminated Intravascular Coagulation" },
      {
        acronym: "HELLP",
        expansion: "Hemolysis, Elevated Liver enzymes, Low Platelets",
      },
      { acronym: "MODS", expansion: "Multiple Organ Dysfunction Syndrome" },
      { acronym: "SIRS", expansion: "Systemic Inflammatory Response Syndrome" },
      { acronym: "ARDS", expansion: "Acute Respiratory Distress Syndrome" },
      { acronym: "TACE", expansion: "Transarterial Chemoembolization" },
      { acronym: "WPW", expansion: "Wolff-Parkinson-White syndrome" },
      { acronym: "PT", expansion: "Prothrombin Time", category: "Labs" },
      { acronym: "PT", expansion: "Physical Therapy", category: "Rehab" },
      { acronym: "PE", expansion: "Pulmonary Embolism", category: "Pulmonary" },
      {
        acronym: "PE",
        expansion: "Physical Examination",
        category: "Clinical",
      },
    ];
  }

  medicalAcronymQueries.bulkInsert(loadedAcronyms);
  console.log(
    `[Database] Seeded ${loadedAcronyms.length} medical acronyms total`
  );
}

// ============================================================================
// Medical Acronym Queries
// ============================================================================

export const medicalAcronymQueries = {
  getAll(): DbMedicalAcronym[] {
    const stmt = getDatabase().prepare("SELECT * FROM medical_acronyms");
    return stmt.all() as DbMedicalAcronym[];
  },

  getByAcronym(acronym: string): DbMedicalAcronym[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM medical_acronyms WHERE acronym = ?"
    );
    return stmt.all(acronym.toUpperCase()) as DbMedicalAcronym[];
  },

  insert(entry: DbMedicalAcronym): void {
    const stmt = getDatabase().prepare(`
      INSERT OR IGNORE INTO medical_acronyms (acronym, expansion, category)
      VALUES (?, ?, ?)
    `);
    stmt.run(
      entry.acronym.toUpperCase(),
      entry.expansion,
      entry.category || null
    );
    invalidateAcronymCache();
  },

  bulkInsert(entries: DbMedicalAcronym[]): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO medical_acronyms (acronym, expansion, category)
      VALUES (?, ?, ?)
    `);
    const insertMany = db.transaction((items: DbMedicalAcronym[]) => {
      for (const item of items) {
        stmt.run(
          item.acronym.toUpperCase(),
          item.expansion,
          item.category || null
        );
      }
    });
    insertMany(entries);
    invalidateAcronymCache();
  },

  clear(): void {
    getDatabase().exec("DELETE FROM medical_acronyms");
    invalidateAcronymCache();
  },
};

let acronymCache: Map<string, string[]> | null = null;

/**
 * Loads and returns medical acronyms in a fast-lookup Map.
 * Used for <200ms search query expansion.
 */
export function getAcronymCache(): Map<string, string[]> {
  if (acronymCache) return acronymCache;

  const all = medicalAcronymQueries.getAll();
  const cache = new Map<string, string[]>();
  for (const entry of all) {
    const upper = entry.acronym.toUpperCase();
    if (!cache.has(upper)) {
      cache.set(upper, []);
    }
    cache.get(upper)!.push(entry.expansion);
  }
  acronymCache = cache;
  return cache;
}

export function invalidateAcronymCache(): void {
  acronymCache = null;
}

// ============================================================================
// FTS5 Search Queries
// ============================================================================

export type SearchFilter = "all" | "cards" | "notes" | "inbox";

export interface SearchResultItem {
  id: string;
  type: "card" | "note" | "source_item";
  title: string;
  snippet: string;
  createdAt: string;
  tags?: string[];
}

export interface SearchResult {
  results: SearchResultItem[];
  counts: {
    all: number;
    cards: number;
    notes: number;
    inbox: number;
  };
  queryTimeMs: number;
}

interface FtsRow {
  id: string;
  snippet: string;
  createdAt: string;
  tags?: string;
}

export const searchQueries = {
  /**
   * Search across cards, notes, and source_items using FTS5.
   * Supports #tag syntax which is converted to tag filter.
   * Returns results with snippets and counts per type.
   */
  search(
    query: string,
    filter: SearchFilter = "all",
    limit = 50
  ): SearchResult {
    const startTime = performance.now();
    const db = getDatabase();
    const cache = getAcronymCache();

    // Extract #tag patterns and convert to regular search terms
    const searchTags: string[] = [];
    let textQuery = query
      .replace(/#(\w+)/g, (_, tag) => {
        searchTags.push(tag.toLowerCase());
        return "";
      })
      .trim();

    // Escape FTS5 special characters and prepare query with acronym expansion
    const terms = textQuery
      .replace(/['"]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => {
        const upperTerm = term.toUpperCase();
        const expansions = cache.get(upperTerm);

        if (expansions && expansions.length > 0) {
          // Expand to (acronym OR "expansion 1" OR "expansion 2"...)
          const orTerms = [
            `"${term}"*`,
            ...expansions.map((exp) => `"${exp}"`),
          ];
          return `(${orTerms.join(" OR ")})`;
        }
        return `"${term}"*`;
      });

    // Add tags to FTS query if present
    const tagTerms = searchTags.map((tag) => `tags:${tag}`);

    // Construct final FTS query
    let ftsQuery = "";
    if (terms.length > 0 && tagTerms.length > 0) {
      ftsQuery = `(${terms.join(" AND ")}) AND ${tagTerms.join(" AND ")}`;
    } else if (terms.length > 0) {
      ftsQuery = terms.join(" AND ");
    } else if (tagTerms.length > 0) {
      ftsQuery = tagTerms.join(" AND ");
    }

    if (!ftsQuery) {
      return {
        results: [],
        counts: { all: 0, cards: 0, notes: 0, inbox: 0 },
        queryTimeMs: performance.now() - startTime,
      };
    }

    const results: SearchResultItem[] = [];

    // Search cards
    if (filter === "all" || filter === "cards") {
      const cardsStmt = db.prepare(`
        SELECT
          c.id,
          c.createdAt,
          c.tags,
          snippet(cards_fts, 1, '<mark>', '</mark>', '...', 32) as s1,
          snippet(cards_fts, 2, '<mark>', '</mark>', '...', 32) as s2,
          snippet(cards_fts, 3, '<mark>', '</mark>', '...', 32) as s3
        FROM cards_fts
        JOIN cards c ON cards_fts.id = c.id
        WHERE cards_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
      const cardRows = cardsStmt.all(ftsQuery, limit) as any[];
      cardRows.forEach((row) => {
        const snippet =
          [row.s1, row.s2, row.s3].find((s) => s && s.includes("<mark>")) ||
          row.s1 ||
          "";
        results.push({
          id: row.id,
          type: "card",
          title: row.s1 ? row.s1.replace(/<mark>|<\/mark>/g, "") : "",
          snippet: snippet,
          createdAt: row.createdAt,
          tags: row.tags ? JSON.parse(row.tags) : [],
        });
      });
    }

    // Search notes
    if (filter === "all" || filter === "notes") {
      const notesStmt = db.prepare(`
        SELECT
          n.id,
          n.title,
          n.createdAt,
          n.tags,
          snippet(notes_fts, 1, '<mark>', '</mark>', '...', 32) as s1,
          snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as s2,
          snippet(notes_fts, 3, '<mark>', '</mark>', '...', 32) as s3
        FROM notes_fts
        JOIN notes n ON notes_fts.id = n.id
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
      const noteRows = notesStmt.all(ftsQuery, limit) as any[];
      noteRows.forEach((row) => {
        const snippet =
          [row.s2, row.s1, row.s3].find((s) => s && s.includes("<mark>")) ||
          row.s2 ||
          "";
        results.push({
          id: row.id,
          type: "note",
          title: row.title,
          snippet: snippet,
          createdAt: row.createdAt,
          tags: row.tags ? JSON.parse(row.tags) : [],
        });
      });
    }

    // Search source_items (inbox)
    if (filter === "all" || filter === "inbox") {
      const sourceStmt = db.prepare(`
        SELECT
          s.id,
          s.title,
          s.createdAt,
          s.tags,
          snippet(source_items_fts, 1, '<mark>', '</mark>', '...', 32) as s1,
          snippet(source_items_fts, 2, '<mark>', '</mark>', '...', 32) as s2,
          snippet(source_items_fts, 4, '<mark>', '</mark>', '...', 32) as s3
        FROM source_items_fts
        JOIN source_items s ON source_items_fts.id = s.id
        WHERE source_items_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
      const sourceRows = sourceStmt.all(ftsQuery, limit) as any[];
      sourceRows.forEach((row) => {
        const snippet =
          [row.s2, row.s1, row.s3].find((s) => s && s.includes("<mark>")) ||
          row.s2 ||
          "";
        results.push({
          id: row.id,
          type: "source_item",
          title: row.title,
          snippet: snippet,
          createdAt: row.createdAt,
          tags: row.tags ? JSON.parse(row.tags) : [],
        });
      });
    }

    // Get counts for each type
    const counts = { all: 0, cards: 0, notes: 0, inbox: 0 };

    try {
      counts.cards = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM cards_fts WHERE cards_fts MATCH ?`
          )
          .get(ftsQuery) as { count: number }
      ).count;
    } catch {
      counts.cards = 0;
    }

    try {
      counts.notes = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM notes_fts WHERE notes_fts MATCH ?`
          )
          .get(ftsQuery) as { count: number }
      ).count;
    } catch {
      counts.notes = 0;
    }

    try {
      counts.inbox = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM source_items_fts WHERE source_items_fts MATCH ?`
          )
          .get(ftsQuery) as { count: number }
      ).count;
    } catch {
      counts.inbox = 0;
    }

    counts.all = counts.cards + counts.notes + counts.inbox;

    const queryTimeMs = performance.now() - startTime;

    // Performance warning if >200ms
    if (queryTimeMs > 200) {
      console.warn(
        `[Search] Query took ${queryTimeMs.toFixed(1)}ms (>200ms threshold)`
      );
    }

    return {
      results,
      counts,
      queryTimeMs,
    };
  },
};

// ============================================================================
// Database Status
// ============================================================================

export interface DbStatus {
  version: number;
  cardCount: number;
  noteCount: number;
  quickCaptureCount: number; // Legacy/Compat
  inboxCount: number;
  queueCount: number;
  connectionCount: number;
}

export function getDatabaseStatus(): DbStatus {
  const db = getDatabase();
  const version = getSchemaVersion();
  const cardCount = (
    db.prepare("SELECT COUNT(*) as count FROM cards").get() as { count: number }
  ).count;
  const noteCount = (
    db.prepare("SELECT COUNT(*) as count FROM notes").get() as { count: number }
  ).count;

  // Backward compatibility: count quick_dumps if table exists, else 0
  let quickCaptureCount = 0;
  try {
    if (tableExists("quick_dumps")) {
      quickCaptureCount = (
        db.prepare("SELECT COUNT(*) as count FROM quick_dumps").get() as {
          count: number;
        }
      ).count;
    }
  } catch (e) {
    // Ignore error if table doesn't exist
  }

  const inboxCount = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM source_items WHERE status = 'inbox'"
      )
      .get() as {
      count: number;
    }
  ).count;

  const queueCount = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM source_items WHERE status = 'inbox' AND sourceType = 'quickcapture'"
      )
      .get() as {
      count: number;
    }
  ).count;

  const connectionCount = (
    db.prepare("SELECT COUNT(*) as count FROM connections").get() as {
      count: number;
    }
  ).count;

  return {
    version,
    cardCount,
    noteCount,
    quickCaptureCount,
    inboxCount,
    queueCount,
    connectionCount,
  };
}