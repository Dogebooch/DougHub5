import { getDatabase } from "./db-connection";
import type {
  DbIntakeQuizAttempt,
  IntakeQuizAttemptRow,
} from "./types";

export const intakeQuizQueries = {
  /**
   * Save an intake quiz attempt
   */
  saveAttempt(attempt: DbIntakeQuizAttempt): void {
    const stmt = getDatabase().prepare(`
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
  getBySource(sourceItemId: string): DbIntakeQuizAttempt[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM intake_quiz_attempts
      WHERE sourceItemId = ?
      ORDER BY attemptedAt DESC
    `);
    const rows = stmt.all(sourceItemId) as IntakeQuizAttemptRow[];
    return rows.map(parseIntakeQuizAttemptRow);
  },

  /**
   * Get all quiz attempts for a block
   */
  getByBlock(blockId: string): DbIntakeQuizAttempt[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM intake_quiz_attempts
      WHERE blockId = ?
      ORDER BY attemptedAt DESC
    `);
    const rows = stmt.all(blockId) as IntakeQuizAttemptRow[];
    return rows.map(parseIntakeQuizAttemptRow);
  },

  /**
   * Get quiz attempts for a topic page
   */
  getByTopicPage(topicPageId: string): DbIntakeQuizAttempt[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM intake_quiz_attempts
      WHERE notebookTopicPageId = ?
      ORDER BY attemptedAt DESC
    `);
    const rows = stmt.all(topicPageId) as IntakeQuizAttemptRow[];
    return rows.map(parseIntakeQuizAttemptRow);
  },

  /**
   * Get a single attempt by ID
   */
  getById(id: string): DbIntakeQuizAttempt | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM intake_quiz_attempts WHERE id = ?"
    );
    const row = stmt.get(id) as IntakeQuizAttemptRow | undefined;
    return row ? parseIntakeQuizAttemptRow(row) : null;
  },

  /**
   * Delete all attempts for a source item (e.g., when removing from notebook)
   */
  deleteBySource(sourceItemId: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM intake_quiz_attempts WHERE sourceItemId = ?"
    );
    stmt.run(sourceItemId);
  },

  /**
   * Delete all attempts for a block
   */
  deleteByBlock(blockId: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM intake_quiz_attempts WHERE blockId = ?"
    );
    stmt.run(blockId);
  },
};

function parseIntakeQuizAttemptRow(row: IntakeQuizAttemptRow): DbIntakeQuizAttempt {
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
