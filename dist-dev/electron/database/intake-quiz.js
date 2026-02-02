"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intakeQuizQueries = void 0;
const db_connection_1 = require("./db-connection");
exports.intakeQuizQueries = {
    /**
     * Save an intake quiz attempt
     */
    saveAttempt(attempt) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO intake_quiz_attempts (
        id, sourceItemId, notebookTopicPageId, blockId, questionText,
        userAnswer, isCorrect, wasSkipped, attemptedAt
      ) VALUES (
        @id, @sourceItemId, @notebookTopicPageId, @blockId, @questionText,
        @userAnswer, @isCorrect, @wasSkipped, @attemptedAt
      )
    `);
        stmt.run({
            ...attempt,
            userAnswer: attempt.userAnswer || null,
            isCorrect: attempt.isCorrect !== undefined ? (attempt.isCorrect ? 1 : 0) : null,
            wasSkipped: attempt.wasSkipped ? 1 : 0,
        });
    },
    /**
     * Get all quiz attempts for a source item
     */
    getBySource(sourceItemId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM intake_quiz_attempts
      WHERE sourceItemId = ?
      ORDER BY attemptedAt DESC
    `);
        const rows = stmt.all(sourceItemId);
        return rows.map(parseIntakeQuizAttemptRow);
    },
    /**
     * Get all quiz attempts for a block
     */
    getByBlock(blockId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM intake_quiz_attempts
      WHERE blockId = ?
      ORDER BY attemptedAt DESC
    `);
        const rows = stmt.all(blockId);
        return rows.map(parseIntakeQuizAttemptRow);
    },
    /**
     * Get quiz attempts for a topic page
     */
    getByTopicPage(topicPageId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM intake_quiz_attempts
      WHERE notebookTopicPageId = ?
      ORDER BY attemptedAt DESC
    `);
        const rows = stmt.all(topicPageId);
        return rows.map(parseIntakeQuizAttemptRow);
    },
    /**
     * Get a single attempt by ID
     */
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM intake_quiz_attempts WHERE id = ?");
        const row = stmt.get(id);
        return row ? parseIntakeQuizAttemptRow(row) : null;
    },
    /**
     * Delete all attempts for a source item (e.g., when removing from notebook)
     */
    deleteBySource(sourceItemId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM intake_quiz_attempts WHERE sourceItemId = ?");
        stmt.run(sourceItemId);
    },
    /**
     * Delete all attempts for a block
     */
    deleteByBlock(blockId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM intake_quiz_attempts WHERE blockId = ?");
        stmt.run(blockId);
    },
};
function parseIntakeQuizAttemptRow(row) {
    return {
        id: row.id,
        sourceItemId: row.sourceItemId,
        notebookTopicPageId: row.notebookTopicPageId,
        blockId: row.blockId,
        questionText: row.questionText,
        userAnswer: row.userAnswer || undefined,
        isCorrect: row.isCorrect !== null ? row.isCorrect === 1 : undefined,
        wasSkipped: row.wasSkipped === 1,
        attemptedAt: row.attemptedAt,
    };
}
