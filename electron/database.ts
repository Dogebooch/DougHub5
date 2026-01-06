import Database from 'better-sqlite3';
import { createBackup, restoreBackup } from "./backup-service";

// ============================================================================
// Types (local to database layer, will sync with types/index.ts in Phase 4)
// ============================================================================

export type CardType = "standard" | "qa" | "cloze" | "vignette" | "list-cloze";
export type ExtractionStatus = "pending" | "processing" | "completed";

// v3 Architecture types
export type SourceType = 'qbank' | 'article' | 'pdf' | 'image' | 'audio' | 'quickcapture' | 'manual';
export type SourceItemStatus = 'inbox' | 'processed' | 'curated';

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

export interface DbQuickDump {
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

interface QuickDumpRow {
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

      // Quick dumps table
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
            const title = dump.content.substring(0, 50).trim() + (dump.content.length > 50 ? "..." : "");

            insertStmt.run(
              dump.id,
              "quickcapture",
              "Quick Dump",
              title,
              dump.content,
              "[]", // empty canonicalTopicIds
              "[]", // empty tags
              status,
              dump.createdAt,
              dump.processedAt
            );
          }

          console.log(`[Migration] Migrated ${quickDumps.length} quick_dumps to source_items`);
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

  // Seed system smart views (v3)
  if (getSchemaVersion() >= 3) {
    seedSystemSmartViews();
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
// Quick Dump Queries
// ============================================================================

function mapSourceToQuickDump(item: DbSourceItem): DbQuickDump {
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

export const quickDumpQueries = {
  getAll(): DbQuickDump[] {
    const items = sourceItemQueries.getByType("quickcapture");
    return items.map(mapSourceToQuickDump);
  },

  getByStatus(status: ExtractionStatus): DbQuickDump[] {
    const items = sourceItemQueries.getByType("quickcapture").filter((item) => {
      const qd = mapSourceToQuickDump(item);
      return qd.extractionStatus === status;
    });
    return items.map(mapSourceToQuickDump);
  },

  insert(dump: DbQuickDump): void {
    const title =
      dump.content.substring(0, 50).trim() +
      (dump.content.length > 50 ? "..." : "");

    const sourceItem: DbSourceItem = {
      id: dump.id,
      sourceType: "quickcapture",
      sourceName: "Quick Dump",
      title: title,
      rawContent: dump.content,
      canonicalTopicIds: [],
      tags: [],
      status: dump.extractionStatus === "completed" ? "processed" : "inbox",
      createdAt: dump.createdAt,
      processedAt: dump.processedAt || undefined,
      updatedAt: dump.createdAt,
    };
    sourceItemQueries.insert(sourceItem);
  },

  update(id: string, updates: Partial<DbQuickDump>): void {
    const current = sourceItemQueries.getById(id);
    if (!current || current.sourceType !== "quickcapture") {
      throw new Error(`Quick dump not found: ${id}`);
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

function parseQuickDumpRow(row: QuickDumpRow): DbQuickDump {
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
      ...item,
      sourceUrl: item.sourceUrl || null,
      mediaPath: item.mediaPath || null,
      transcription: item.transcription || null,
      questionId: item.questionId || null,
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
      ...merged,
      sourceUrl: merged.sourceUrl || null,
      mediaPath: merged.mediaPath || null,
      transcription: merged.transcription || null,
      questionId: merged.questionId || null,
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
    const stmt = getDatabase().prepare(
      "SELECT * FROM notebook_blocks WHERE notebookTopicPageId = ? ORDER BY position"
    );
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

// ============================================================================
// Database Status
// ============================================================================

export interface DbStatus {
  version: number;
  cardCount: number;
  noteCount: number;
  quickDumpCount: number; // Legacy/Compat
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
  let quickDumpCount = 0;
  try {
    if (tableExists("quick_dumps")) {
      quickDumpCount = (
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
    quickDumpCount,
    inboxCount,
    queueCount,
    connectionCount,
  };
}