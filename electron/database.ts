import Database from 'better-sqlite3';

// ============================================================================
// Types (local to database layer, will sync with types/index.ts in Phase 4)
// ============================================================================

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
}

// ============================================================================
// Database Initialization
// ============================================================================

let db: Database.Database | null = null;

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

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Set schema version
  db.pragma('user_version = 1');

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

  return db;
}

/**
 * Get the database instance. Throws if not initialized.
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
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
  }
}

// ============================================================================
// Card Queries
// ============================================================================

export const cardQueries = {
  getAll(): DbCard[] {
    const stmt = getDatabase().prepare('SELECT * FROM cards');
    const rows = stmt.all() as CardRow[];
    return rows.map(parseCardRow);
  },

  insert(card: DbCard): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO cards (
        id, front, back, noteId, tags, dueDate, createdAt,
        stability, difficulty, elapsedDays, scheduledDays,
        reps, lapses, state, lastReview
      ) VALUES (
        @id, @front, @back, @noteId, @tags, @dueDate, @createdAt,
        @stability, @difficulty, @elapsedDays, @scheduledDays,
        @reps, @lapses, @state, @lastReview
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
        lastReview = @lastReview
      WHERE id = @id
    `);
    stmt.run({
      ...merged,
      tags: JSON.stringify(merged.tags),
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare('DELETE FROM cards WHERE id = @id');
    stmt.run({ id });
  },
};

function parseCardRow(row: CardRow): DbCard {
  return {
    ...row,
    tags: JSON.parse(row.tags),
  };
}

// ============================================================================
// Note Queries
// ============================================================================

export const noteQueries = {
  getAll(): DbNote[] {
    const stmt = getDatabase().prepare('SELECT * FROM notes');
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
    const stmt = getDatabase().prepare('DELETE FROM notes WHERE id = @id');
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
    const stmt = getDatabase().prepare('SELECT * FROM review_logs ORDER BY createdAt DESC');
    const rows = stmt.all() as ReviewLogRow[];
    return rows;
  },

  insert(log: DbReviewLog): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO review_logs (
        id, cardId, rating, state, scheduledDays, elapsedDays, review, createdAt
      ) VALUES (
        @id, @cardId, @rating, @state, @scheduledDays, @elapsedDays, @review, @createdAt
      )
    `);
    stmt.run(log);
  },
};
