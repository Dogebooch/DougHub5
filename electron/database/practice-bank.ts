/**
 * Practice Bank Flashcard Query Module
 *
 * CRUD operations for the "Anti-Anki-Hell" tiered flashcard system.
 *
 * Features:
 * - Generate cards from Knowledge Entity at Forging time
 * - Activate/deactivate Practice Bank cards
 * - Track maturity state (new → learning → reviewing → mature → retired)
 * - Resurrect retired cards on Simulator failure
 * - FSRS scheduling integration
 */

import { getDatabase } from "./db-connection";
import type {
  DbPracticeBankFlashcard,
  PracticeBankFlashcardRow,
  PracticeBankCardType,
  PracticeBankMaturityState,
  DbSimulatorAttempt,
  SimulatorAttemptRow,
} from "./types";

// ============================================================================
// Flashcard CRUD Operations
// ============================================================================

export const practiceBankQueries = {
  /**
   * Get all flashcards for an entity
   */
  getByEntityId(entityId: string): DbPracticeBankFlashcard[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM practice_bank_flashcards WHERE entityId = ? ORDER BY isGoldenTicket DESC, cardType",
    );
    const rows = stmt.all(entityId) as PracticeBankFlashcardRow[];
    return rows.map(parseFlashcardRow);
  },

  /**
   * Get a single flashcard by ID
   */
  getById(id: string): DbPracticeBankFlashcard | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM practice_bank_flashcards WHERE id = ?",
    );
    const row = stmt.get(id) as PracticeBankFlashcardRow | undefined;
    return row ? parseFlashcardRow(row) : null;
  },

  /**
   * Get all active cards (for daily review queue)
   */
  getActiveCards(): DbPracticeBankFlashcard[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM practice_bank_flashcards WHERE isActive = 1 ORDER BY dueDate",
    );
    const rows = stmt.all() as PracticeBankFlashcardRow[];
    return rows.map(parseFlashcardRow);
  },

  /**
   * Get due cards (active + due today or earlier)
   */
  getDueCards(): DbPracticeBankFlashcard[] {
    const today = new Date().toISOString().split("T")[0];
    const stmt = getDatabase().prepare(
      `SELECT * FROM practice_bank_flashcards
       WHERE isActive = 1 AND (dueDate IS NULL OR dueDate <= ?)
       ORDER BY dueDate`,
    );
    const rows = stmt.all(today) as PracticeBankFlashcardRow[];
    return rows.map(parseFlashcardRow);
  },

  /**
   * Get mature entities (interval >= 60 days, eligible for Simulator)
   */
  getMatureEntityIds(): string[] {
    const stmt = getDatabase().prepare(
      `SELECT DISTINCT entityId FROM practice_bank_flashcards
       WHERE isGoldenTicket = 1 AND maturityState = 'retired'`,
    );
    const rows = stmt.all() as { entityId: string }[];
    return rows.map((r) => r.entityId);
  },

  /**
   * Insert a new flashcard
   */
  insert(card: DbPracticeBankFlashcard): void {
    const now = new Date().toISOString();
    const stmt = getDatabase().prepare(`
      INSERT INTO practice_bank_flashcards (
        id, entityId, cardType, front, back, isGoldenTicket, isActive,
        stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state,
        dueDate, lastReview, maturityState, retiredAt, resurrectCount,
        createdAt, updatedAt
      ) VALUES (
        @id, @entityId, @cardType, @front, @back, @isGoldenTicket, @isActive,
        @stability, @difficulty, @elapsedDays, @scheduledDays, @reps, @lapses, @state,
        @dueDate, @lastReview, @maturityState, @retiredAt, @resurrectCount,
        @createdAt, @updatedAt
      )
    `);

    stmt.run({
      id: card.id,
      entityId: card.entityId,
      cardType: card.cardType,
      front: card.front,
      back: card.back,
      isGoldenTicket: card.isGoldenTicket ? 1 : 0,
      isActive: card.isActive ? 1 : 0,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsedDays,
      scheduledDays: card.scheduledDays,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      dueDate: card.dueDate || null,
      lastReview: card.lastReview || null,
      maturityState: card.maturityState,
      retiredAt: card.retiredAt || null,
      resurrectCount: card.resurrectCount,
      createdAt: card.createdAt || now,
      updatedAt: card.updatedAt || now,
    });
  },

  /**
   * Insert multiple cards (for batch generation at Forging)
   */
  insertMany(cards: DbPracticeBankFlashcard[]): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO practice_bank_flashcards (
        id, entityId, cardType, front, back, isGoldenTicket, isActive,
        stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state,
        dueDate, lastReview, maturityState, retiredAt, resurrectCount,
        createdAt, updatedAt
      ) VALUES (
        @id, @entityId, @cardType, @front, @back, @isGoldenTicket, @isActive,
        @stability, @difficulty, @elapsedDays, @scheduledDays, @reps, @lapses, @state,
        @dueDate, @lastReview, @maturityState, @retiredAt, @resurrectCount,
        @createdAt, @updatedAt
      )
    `);

    const insertMany = db.transaction((cardList: DbPracticeBankFlashcard[]) => {
      for (const card of cardList) {
        stmt.run({
          id: card.id,
          entityId: card.entityId,
          cardType: card.cardType,
          front: card.front,
          back: card.back,
          isGoldenTicket: card.isGoldenTicket ? 1 : 0,
          isActive: card.isActive ? 1 : 0,
          stability: card.stability,
          difficulty: card.difficulty,
          elapsedDays: card.elapsedDays,
          scheduledDays: card.scheduledDays,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state,
          dueDate: card.dueDate || null,
          lastReview: card.lastReview || null,
          maturityState: card.maturityState,
          retiredAt: card.retiredAt || null,
          resurrectCount: card.resurrectCount,
          createdAt: card.createdAt || now,
          updatedAt: card.updatedAt || now,
        });
      }
    });

    insertMany(cards);
  },

  /**
   * Activate a Practice Bank card (move to review queue)
   */
  activateCard(id: string): void {
    const now = new Date().toISOString();
    const today = new Date().toISOString().split("T")[0];
    const stmt = getDatabase().prepare(`
      UPDATE practice_bank_flashcards
      SET isActive = 1, dueDate = ?, maturityState = 'new', updatedAt = ?
      WHERE id = ? AND isActive = 0
    `);
    stmt.run(today, now, id);
  },

  /**
   * Deactivate a card (remove from review queue)
   */
  deactivateCard(id: string): void {
    const now = new Date().toISOString();
    const stmt = getDatabase().prepare(`
      UPDATE practice_bank_flashcards
      SET isActive = 0, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(now, id);
  },

  /**
   * Retire a card (Golden Ticket reached maturity)
   */
  retireCard(id: string): void {
    const now = new Date().toISOString();
    const stmt = getDatabase().prepare(`
      UPDATE practice_bank_flashcards
      SET isActive = 0, maturityState = 'retired', retiredAt = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(now, now, id);
  },

  /**
   * Resurrect a retired card (Simulator failure triggered it)
   * Comes back at 7 days, not from scratch
   */
  resurrectCard(id: string): void {
    const now = new Date().toISOString();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const stmt = getDatabase().prepare(`
      UPDATE practice_bank_flashcards
      SET isActive = 1,
          maturityState = 'reviewing',
          dueDate = ?,
          scheduledDays = 7,
          state = 2,
          retiredAt = NULL,
          resurrectCount = resurrectCount + 1,
          updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(sevenDaysFromNow, now, id);
  },

  /**
   * Update FSRS state after review
   */
  updateFsrsState(
    id: string,
    fsrsState: {
      stability: number;
      difficulty: number;
      elapsedDays: number;
      scheduledDays: number;
      reps: number;
      lapses: number;
      state: number;
      dueDate: string;
      lastReview: string;
    },
  ): void {
    const now = new Date().toISOString();

    // Calculate maturity state based on interval
    let maturityState: PracticeBankMaturityState = "learning";
    if (fsrsState.state === 0) {
      maturityState = "new";
    } else if (fsrsState.state === 1 || fsrsState.state === 3) {
      maturityState = "learning";
    } else if (fsrsState.scheduledDays >= 60) {
      maturityState = "mature";
    } else {
      maturityState = "reviewing";
    }

    const stmt = getDatabase().prepare(`
      UPDATE practice_bank_flashcards
      SET stability = ?, difficulty = ?, elapsedDays = ?, scheduledDays = ?,
          reps = ?, lapses = ?, state = ?, dueDate = ?, lastReview = ?,
          maturityState = ?, updatedAt = ?
      WHERE id = ?
    `);

    stmt.run(
      fsrsState.stability,
      fsrsState.difficulty,
      fsrsState.elapsedDays,
      fsrsState.scheduledDays,
      fsrsState.reps,
      fsrsState.lapses,
      fsrsState.state,
      fsrsState.dueDate,
      fsrsState.lastReview,
      maturityState,
      now,
      id,
    );
  },

  /**
   * Delete all cards for an entity
   */
  deleteByEntityId(entityId: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM practice_bank_flashcards WHERE entityId = ?",
    );
    stmt.run(entityId);
  },

  /**
   * Get card counts by entity (for UI display)
   */
  getCardCountsByEntity(entityId: string): {
    total: number;
    active: number;
    banked: number;
    retired: number;
  } {
    const stmt = getDatabase().prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN isActive = 1 AND maturityState != 'retired' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN isActive = 0 AND maturityState != 'retired' THEN 1 ELSE 0 END) as banked,
        SUM(CASE WHEN maturityState = 'retired' THEN 1 ELSE 0 END) as retired
      FROM practice_bank_flashcards
      WHERE entityId = ?
    `);
    const row = stmt.get(entityId) as {
      total: number;
      active: number;
      banked: number;
      retired: number;
    };
    return row;
  },

  /**
   * Find card by entity and type (for activation by failure attribution)
   */
  findByEntityAndType(
    entityId: string,
    cardType: PracticeBankCardType,
  ): DbPracticeBankFlashcard | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM practice_bank_flashcards WHERE entityId = ? AND cardType = ?",
    );
    const row = stmt.get(entityId, cardType) as
      | PracticeBankFlashcardRow
      | undefined;
    return row ? parseFlashcardRow(row) : null;
  },
};

// ============================================================================
// Simulator Attempt Operations
// ============================================================================

export const simulatorAttemptQueries = {
  /**
   * Record a simulator attempt
   */
  insert(attempt: DbSimulatorAttempt): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO simulator_attempts (
        id, entityId, vignetteText, userAnswer, correctAnswer,
        isCorrect, failureAttributions, attemptedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      attempt.id,
      attempt.entityId,
      attempt.vignetteText,
      attempt.userAnswer,
      attempt.correctAnswer,
      attempt.isCorrect ? 1 : 0,
      attempt.failureAttributions
        ? JSON.stringify(attempt.failureAttributions)
        : null,
      attempt.attemptedAt,
    );
  },

  /**
   * Get attempts for an entity
   */
  getByEntityId(entityId: string): DbSimulatorAttempt[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM simulator_attempts WHERE entityId = ? ORDER BY attemptedAt DESC",
    );
    const rows = stmt.all(entityId) as SimulatorAttemptRow[];
    return rows.map(parseAttemptRow);
  },

  /**
   * Get today's attempt count (for daily cap)
   */
  getTodayAttemptCount(): number {
    const today = new Date().toISOString().split("T")[0];
    const stmt = getDatabase().prepare(
      "SELECT COUNT(*) as count FROM simulator_attempts WHERE attemptedAt >= ?",
    );
    const row = stmt.get(today) as { count: number };
    return row.count;
  },

  /**
   * Get failure rate for an entity
   */
  getFailureRate(entityId: string): number {
    const stmt = getDatabase().prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN isCorrect = 0 THEN 1 ELSE 0 END) as failures
      FROM simulator_attempts
      WHERE entityId = ?
    `);
    const row = stmt.get(entityId) as { total: number; failures: number };
    return row.total > 0 ? row.failures / row.total : 0;
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function parseFlashcardRow(
  row: PracticeBankFlashcardRow,
): DbPracticeBankFlashcard {
  return {
    id: row.id,
    entityId: row.entityId,
    cardType: row.cardType as PracticeBankCardType,
    front: row.front,
    back: row.back,
    isGoldenTicket: row.isGoldenTicket === 1,
    isActive: row.isActive === 1,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsedDays,
    scheduledDays: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    dueDate: row.dueDate,
    lastReview: row.lastReview,
    maturityState: row.maturityState as PracticeBankMaturityState,
    retiredAt: row.retiredAt,
    resurrectCount: row.resurrectCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseAttemptRow(row: SimulatorAttemptRow): DbSimulatorAttempt {
  return {
    id: row.id,
    entityId: row.entityId,
    vignetteText: row.vignetteText,
    userAnswer: row.userAnswer,
    correctAnswer: row.correctAnswer,
    isCorrect: row.isCorrect === 1,
    failureAttributions: row.failureAttributions
      ? JSON.parse(row.failureAttributions)
      : null,
    attemptedAt: row.attemptedAt,
  };
}
