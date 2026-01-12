import { getDatabase } from "./db-connection";
import type { ConnectionRow, DbConnection } from "./types";

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
