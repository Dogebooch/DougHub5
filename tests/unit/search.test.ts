import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import {
  createTestDb,
  cleanupTestDb,
  assertTablesExist,
} from "../helpers/db-helpers";
import {
  initDatabase,
  searchQueries,
  closeDatabase,
} from "@electron/database";

// Mock backup-service
vi.mock("@electron/backup-service", () => ({
  createBackup: vi.fn((dbPath: string) => `${dbPath}.backup`),
  restoreBackup: vi.fn(),
}));

describe('Search Functionality (FTS5)', () => {
  let dbPath: string;
  let db: Database.Database;

  beforeEach(() => {
    const testDb = createTestDb('search');
    db = testDb.db;
    dbPath = testDb.dbPath;
    initDatabase(dbPath);
  });

  afterEach(() => {
    closeDatabase();
    cleanupTestDb(dbPath);
  });

  describe('Schema & Migration', () => {
    it('creates FTS5 virtual tables during initialization', () => {
      assertTablesExist(db, ['cards_fts', 'notes_fts', 'source_items_fts']);
    });

    it('creates triggers for FTS synchronization', () => {
      const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all() as { name: string }[];
      const triggerNames = triggers.map(t => t.name);
      
      expect(triggerNames).toContain('cards_fts_insert');
      expect(triggerNames).toContain('cards_fts_update');
      expect(triggerNames).toContain('cards_fts_delete');
      expect(triggerNames).toContain('notes_fts_insert');
      expect(triggerNames).toContain('notes_fts_update');
      expect(triggerNames).toContain('notes_fts_delete');
    });
  });

  describe('FTS Synchronization (Triggers)', () => {
    it('syncs data to FTS table on card insert', () => {
      const id = 'card-1';
      db.prepare("INSERT INTO cards (id, front, back, noteId, tags) VALUES (?, ?, ?, ?, ?)").run(
        id, 'Anatomy of the heart', 'Left ventricle is the thickest', 'note-1', '["cardiology"]'
      );
      
      const ftsEntry = db.prepare("SELECT * FROM cards_fts WHERE id = ?").get(id) as any;
      expect(ftsEntry).toBeDefined();
      expect(ftsEntry.front).toContain('Anatomy');
      expect(ftsEntry.back).toContain('ventricle');
    });

    it('syncs data to FTS table on card update', () => {
      const id = 'card-1';
      db.prepare("INSERT INTO cards (id, front, back, noteId, tags) VALUES (?, ?, ?, ?, ?)").run(
        id, 'Old front', 'Old back', 'note-1', '[]'
      );
      
      db.prepare("UPDATE cards SET front = ?, back = ? WHERE id = ?").run(
        'New front', 'New back', id
      );
      
      const ftsEntry = db.prepare("SELECT * FROM cards_fts WHERE id = ?").get(id) as any;
      expect(ftsEntry.front).toBe('New front');
      expect(ftsEntry.back).toBe('New back');
    });

    it('purges data from FTS table on card delete', () => {
      const id = 'card-1';
      db.prepare("INSERT INTO cards (id, front, back, noteId, tags) VALUES (?, ?, ?, ?, ?)").run(
        id, 'Front', 'Back', 'note-1', '[]'
      );
      
      db.prepare("DELETE FROM cards WHERE id = ?").run(id);
      
      const ftsEntry = db.prepare("SELECT * FROM cards_fts WHERE id = ?").get(id);
      expect(ftsEntry).toBeUndefined();
    });
  });

  describe('searchQueries.search() logic', () => {
    beforeEach(() => {
      // Seed some data
      db.prepare("INSERT INTO notes (id, title, content, tags) VALUES (?, ?, ?, ?)").run(
        'note-1', 'Heart Failure', 'Treatment of heart failure includes ACE inhibitors and beta blockers.', '["cardiology", "medicine"]'
      );
      db.prepare("INSERT INTO cards (id, front, back, noteId, tags) VALUES (?, ?, ?, ?, ?)").run(
        'card-1', 'What is the most common cause of heart failure?', 'Ischemic heart disease.', 'note-1', '["cardiology"]'
      );
      db.prepare("INSERT INTO source_items (id, title, rawContent, sourceType, sourceName, status, tags) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        'source-1', 'Journal Article: HFREF', 'HFREF stands for heart failure with reduced ejection fraction.', 'article', 'NEJM', 'inbox', '["cardiology"]'
      );
    });

    it('returns results for simple text matches', () => {
      const result = searchQueries.search('failure');
      expect(result.results.length).toBeGreaterThanOrEqual(3);
      expect(result.counts.all).toBe(3);
      expect(result.results[0].snippet).toContain('<mark>failure</mark>');
    });

    it('respects filter parameter', () => {
      const notesOnly = searchQueries.search('failure', 'notes');
      expect(notesOnly.results.every(r => r.type === 'note')).toBe(true);
      expect(notesOnly.counts.notes).toBe(1);
      expect(notesOnly.counts.all).toBe(3); // Search counts are global
    });

    it('filters by #tag (AND matching)', () => {
      const tagged = searchQueries.search('failure #medicine');
      expect(tagged.results.length).toBe(1);
      expect(tagged.results[0].id).toBe('note-1');
    });

    it('multiple flags #tag1 #tag2', () => {
      const manyTags = searchQueries.search('#cardiology #medicine');
      expect(manyTags.results.length).toBe(1);
      expect(manyTags.results[0].id).toBe('note-1');
    });

    it('prefix matching works', () => {
      const prefix = searchQueries.search('fail'); // Should match 'failure' due to "*" append in implementation
      expect(prefix.results.length).toBeGreaterThanOrEqual(3);
    });

    it('escapes special characters safely', () => {
      expect(() => searchQueries.search(' "quote" \'apostrophe\' ')).not.toThrow();
    });

    it('handles empty results', () => {
      const result = searchQueries.search('nonexistentword12345');
      expect(result.results).toHaveLength(0);
      expect(result.counts.all).toBe(0);
    });

    it('tracks performance in queryTimeMs', () => {
      const result = searchQueries.search('heart');
      expect(result.queryTimeMs).toBeGreaterThan(0);
    });
  });
});
