"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionQueries = void 0;
const db_connection_1 = require("./db-connection");
exports.connectionQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM connections ORDER BY semanticScore DESC");
        const rows = stmt.all();
        return rows;
    },
    getBySourceNote(noteId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM connections WHERE sourceNoteId = ? ORDER BY semanticScore DESC");
        const rows = stmt.all(noteId);
        return rows;
    },
    getByTargetNote(noteId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM connections WHERE targetNoteId = ? ORDER BY semanticScore DESC");
        const rows = stmt.all(noteId);
        return rows;
    },
    insert(connection) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO connections (id, sourceNoteId, targetNoteId, semanticScore, createdAt)
      VALUES (@id, @sourceNoteId, @targetNoteId, @semanticScore, @createdAt)
    `);
        stmt.run(connection);
    },
    delete(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM connections WHERE id = @id");
        stmt.run({ id });
    },
};
