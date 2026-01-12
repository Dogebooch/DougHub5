import { getDatabase } from "./db-connection";
import type { NoteRow, DbNote } from "./types";

export const noteQueries = {
  getAll(): DbNote[] {
    const stmt = getDatabase().prepare("SELECT * FROM notes");
    const rows = stmt.all() as NoteRow[];
    return rows.map(parseNoteRow);
  },

  getById(id: string): DbNote | null {
    const stmt = getDatabase().prepare("SELECT * FROM notes WHERE id = ?");
    const row = stmt.get(id) as NoteRow | undefined;
    return row ? parseNoteRow(row) : null;
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
    const current = noteQueries.getById(id);
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

export function parseNoteRow(row: NoteRow): DbNote {
  return {
    ...row,
    cardIds: JSON.parse(row.cardIds),
    tags: JSON.parse(row.tags),
  };
}
