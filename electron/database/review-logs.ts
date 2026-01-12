import { getDatabase } from "./db-connection";
import type { DbReviewLog, ReviewLogRow } from "./types";

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
        responseTimeMs, partialCreditScore, responseTimeModifier,
        userAnswer, userExplanation
      ) VALUES (
        @id, @cardId, @rating, @state, @scheduledDays, @elapsedDays, @review, @createdAt,
        @responseTimeMs, @partialCreditScore, @responseTimeModifier,
        @userAnswer, @userExplanation
      )
    `);
    stmt.run(log);
  },
};

export function parseReviewLogRow(row: ReviewLogRow): DbReviewLog {
  return {
    ...row,
    responseTimeMs: row.responseTimeMs,
    partialCreditScore: row.partialCreditScore,
    responseTimeModifier: row.responseTimeModifier,
    userAnswer: row.userAnswer,
    userExplanation: row.userExplanation,
  };
}
