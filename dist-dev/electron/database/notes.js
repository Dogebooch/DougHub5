"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noteQueries = void 0;
exports.parseNoteRow = parseNoteRow;
const db_connection_1 = require("./db-connection");
exports.noteQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM notes");
        const rows = stmt.all();
        return rows.map(parseNoteRow);
    },
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM notes WHERE id = ?");
        const row = stmt.get(id);
        return row ? parseNoteRow(row) : null;
    },
    insert(note) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO notes (id, title, content, cardIds, tags, createdAt)
      VALUES (@id, @title, @content, @cardIds, @tags, @createdAt)
    `);
        stmt.run({
            ...note,
            cardIds: JSON.stringify(note.cardIds),
            tags: JSON.stringify(note.tags),
        });
    },
    update(id, updates) {
        const current = exports.noteQueries.getById(id);
        if (!current) {
            throw new Error(`Note not found: ${id}`);
        }
        const merged = { ...current, ...updates };
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
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
    delete(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM notes WHERE id = @id");
        stmt.run({ id });
    },
};
function parseNoteRow(row) {
    return {
        ...row,
        cardIds: JSON.parse(row.cardIds),
        tags: JSON.parse(row.tags),
    };
}
