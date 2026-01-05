import Database from 'better-sqlite3';
import { createBackup, restoreBackup } from "./backup-service";

// ============================================================================
// Types (local to database layer, will sync with types/index.ts in Phase 4)
// ============================================================================

export type CardType = "standard" | "qa" | "cloze" | "vignette" | "list-cloze";
export type ExtractionStatus = "pending" | "processing" | "completed";

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

export const quickDumpQueries = {
  getAll(): DbQuickDump[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM quick_dumps ORDER BY createdAt DESC"
    );
    const rows = stmt.all() as QuickDumpRow[];
    return rows.map(parseQuickDumpRow);
  },

  getByStatus(status: ExtractionStatus): DbQuickDump[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM quick_dumps WHERE extractionStatus = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(status) as QuickDumpRow[];
    return rows.map(parseQuickDumpRow);
  },

  insert(dump: DbQuickDump): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO quick_dumps (id, content, extractionStatus, createdAt, processedAt)
      VALUES (@id, @content, @extractionStatus, @createdAt, @processedAt)
    `);
    stmt.run(dump);
  },

  update(id: string, updates: Partial<DbQuickDump>): void {
    const current = quickDumpQueries.getAll().find((d) => d.id === id);
    if (!current) {
      throw new Error(`Quick dump not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE quick_dumps SET
        content = @content,
        extractionStatus = @extractionStatus,
        createdAt = @createdAt,
        processedAt = @processedAt
      WHERE id = @id
    `);
    stmt.run(merged);
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM quick_dumps WHERE id = @id"
    );
    stmt.run({ id });
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
// Database Status
// ============================================================================

export interface DbStatus {
  version: number;
  cardCount: number;
  noteCount: number;
  quickDumpCount: number;
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
  const quickDumpCount = (
    db.prepare("SELECT COUNT(*) as count FROM quick_dumps").get() as {
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
    connectionCount,
  };
}