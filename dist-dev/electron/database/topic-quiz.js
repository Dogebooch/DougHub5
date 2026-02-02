"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topicQuizQueries = void 0;
const db_connection_1 = require("./db-connection");
const ENTRY_QUIZ_THRESHOLD_DAYS = 7;
exports.topicQuizQueries = {
    /**
     * Save a topic entry quiz attempt
     */
    saveAttempt(attempt) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO topic_quiz_attempts (
        id, notebookTopicPageId, blockId, questionText,
        isCorrect, attemptedAt, daysSinceLastVisit
      ) VALUES (
        @id, @notebookTopicPageId, @blockId, @questionText,
        @isCorrect, @attemptedAt, @daysSinceLastVisit
      )
    `);
        stmt.run({
            ...attempt,
            isCorrect: attempt.isCorrect !== undefined ? (attempt.isCorrect ? 1 : 0) : null,
            daysSinceLastVisit: attempt.daysSinceLastVisit || null,
        });
    },
    /**
     * Get recent quiz attempts for a topic page
     */
    getRecentForTopic(topicPageId, limit = 20) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM topic_quiz_attempts
      WHERE notebookTopicPageId = ?
      ORDER BY attemptedAt DESC
      LIMIT ?
    `);
        const rows = stmt.all(topicPageId, limit);
        return rows.map(parseTopicQuizAttemptRow);
    },
    /**
     * Get quiz attempts for a specific block
     */
    getByBlock(blockId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM topic_quiz_attempts
      WHERE blockId = ?
      ORDER BY attemptedAt DESC
    `);
        const rows = stmt.all(blockId);
        return rows.map(parseTopicQuizAttemptRow);
    },
    /**
     * Check if we should prompt the user for an entry quiz
     * Returns true if lastVisitedAt is null or >= 7 days ago
     */
    shouldPromptEntryQuiz(topicPageId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT lastVisitedAt FROM notebook_topic_pages WHERE id = ?
    `);
        const row = stmt.get(topicPageId);
        if (!row || !row.lastVisitedAt) {
            return { shouldPrompt: false, daysSince: 0 }; // First visit, no quiz needed
        }
        const lastVisit = new Date(row.lastVisitedAt);
        const now = new Date();
        const daysSince = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
        return {
            shouldPrompt: daysSince >= ENTRY_QUIZ_THRESHOLD_DAYS,
            daysSince,
        };
    },
    /**
     * Update the lastVisitedAt timestamp for a topic page
     */
    updateLastVisited(topicPageId) {
        const now = new Date().toISOString();
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      UPDATE notebook_topic_pages SET lastVisitedAt = ? WHERE id = ?
    `);
        stmt.run(now, topicPageId);
    },
    /**
     * Get a single attempt by ID
     */
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM topic_quiz_attempts WHERE id = ?");
        const row = stmt.get(id);
        return row ? parseTopicQuizAttemptRow(row) : null;
    },
    /**
     * Delete all attempts for a topic page
     */
    deleteByTopicPage(topicPageId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM topic_quiz_attempts WHERE notebookTopicPageId = ?");
        stmt.run(topicPageId);
    },
    /**
     * Get blocks that were forgotten in entry quizzes (for dormant card activation)
     */
    getForgottenBlockIds(topicPageId, sinceDate) {
        let sql = `
      SELECT DISTINCT blockId FROM topic_quiz_attempts
      WHERE notebookTopicPageId = ? AND isCorrect = 0
    `;
        const params = [topicPageId];
        if (sinceDate) {
            sql += ` AND attemptedAt >= ?`;
            params.push(sinceDate);
        }
        const stmt = (0, db_connection_1.getDatabase)().prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((r) => r.blockId);
    },
};
function parseTopicQuizAttemptRow(row) {
    return {
        id: row.id,
        notebookTopicPageId: row.notebookTopicPageId,
        blockId: row.blockId,
        questionText: row.questionText,
        isCorrect: row.isCorrect !== null ? row.isCorrect === 1 : undefined,
        attemptedAt: row.attemptedAt,
        daysSinceLastVisit: row.daysSinceLastVisit || undefined,
    };
}
