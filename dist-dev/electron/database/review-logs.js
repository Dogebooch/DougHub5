"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewLogQueries = void 0;
exports.parseReviewLogRow = parseReviewLogRow;
const db_connection_1 = require("./db-connection");
exports.reviewLogQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM review_logs ORDER BY createdAt DESC");
        const rows = stmt.all();
        return rows.map(parseReviewLogRow);
    },
    insert(log) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO review_logs (
        id, cardId, rating, state, scheduledDays, elapsedDays, review, createdAt,
        responseTimeMs, partialCreditScore, responseTimeModifier,
        userAnswer, userExplanation, confidenceRating
      ) VALUES (
        @id, @cardId, @rating, @state, @scheduledDays, @elapsedDays, @review, @createdAt,
        @responseTimeMs, @partialCreditScore, @responseTimeModifier,
        @userAnswer, @userExplanation, @confidenceRating
      )
    `);
        stmt.run({
            ...log,
            confidenceRating: log.confidenceRating || null,
        });
    },
};
function parseReviewLogRow(row) {
    return {
        ...row,
        responseTimeMs: row.responseTimeMs,
        partialCreditScore: row.partialCreditScore,
        responseTimeModifier: row.responseTimeModifier,
        userAnswer: row.userAnswer,
        userExplanation: row.userExplanation,
        // Data Logging Framework (v18)
        confidenceRating: row.confidenceRating || undefined,
    };
}
