import { FSRS, Rating, Card as FSRSCard, State, createEmptyCard, generatorParameters, RecordLogItem } from 'ts-fsrs';
import {
  cardQueries,
  reviewLogQueries,
  settingsQueries,
  getDatabase,
  DbCard,
  DbReviewLog,
} from "./database";
import { randomUUID } from "crypto";

// ============================================================================
// FSRS Configuration
// ============================================================================

/**
 * Difficulty thresholds for UI formatting and status tracking.
 */
export const DIFFICULTY_THRESHOLD_HIGH = 8.0;
export const DIFFICULTY_THRESHOLD_URGENT = 9.0;

/**
 * Initialize FSRS with medical-optimized parameters.
 * 89% retention target balances recall with workload for medical students.
 */
const params = generatorParameters({ request_retention: 0.89 });
const fsrs = new FSRS(params);

// ============================================================================
// Type Mapping Functions
// ============================================================================

/**
 * Calculate multi-factor modifier based on response time.
 * Fast (<5s) increases interval by 15%.
 * Slow (>15s) decreases interval by 15%.
 */
function calculateResponseTimeModifier(responseTimeMs: number | null): number {
  if (responseTimeMs === null || responseTimeMs <= 0) return 1.0;
  if (responseTimeMs < 5000) return 1.15;
  if (responseTimeMs > 15000) return 0.85;
  return 1.0;
}

/**
 * Convert our DbCard to ts-fsrs Card format.
 * Handles snake_case ↔ camelCase and Date conversion.
 */
export function toFSRSCard(card: DbCard): FSRSCard {
  return {
    due: new Date(card.dueDate),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: 0, // Default to 0, will be set by FSRS
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

/**
 * Convert ts-fsrs Card back to our DbCard FSRS fields.
 * Returns partial object to merge with existing DbCard.
 */
export function fromFSRSCard(fsrsCard: FSRSCard): Partial<DbCard> {
  return {
    dueDate: fsrsCard.due.toISOString(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: fsrsCard.state,
    lastReview: fsrsCard.last_review
      ? fsrsCard.last_review.toISOString()
      : null,
  };
}

// ============================================================================
// Review Scheduling
// ============================================================================

export interface ScheduleReviewResult {
  card: DbCard;
  reviewLog: DbReviewLog;
  /** Interval previews for all ratings (for UI display) */
  intervals: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

/**
 * Process a review and schedule the next due date using FSRS algorithm.
 * Updates the database in a transaction.
 *
 * @param cardId - ID of the card being reviewed
 * @param rating - User rating: 1=Again, 2=Hard, 3=Good, 4=Easy
 * @param reviewTime - When the review occurred (defaults to now)
 * @returns Updated card and review log
 */
export function scheduleReview(
  cardId: string,
  rating: Rating,
  reviewTime: Date = new Date(),
  responseTimeMs: number | null = null
): ScheduleReviewResult {
  const db = getDatabase();

  // Get current card from database
  const cards = cardQueries.getAll();
  const dbCard = cards.find((c) => c.id === cardId);
  if (!dbCard) {
    throw new Error(`Card not found: ${cardId}`);
  }

  // Convert to FSRS format
  // If state is 0 (New), create empty card; otherwise convert existing
  const fsrsCard =
    dbCard.state === 0 ? createEmptyCard(reviewTime) : toFSRSCard(dbCard);

  // Get scheduling for all ratings (for interval preview)
  const recordLog = fsrs.repeat(fsrsCard, reviewTime);

  // Get the specific result for the user's rating
  // Use explicit indexing since ts-fsrs uses Rating enum as keys
  let scheduled: RecordLogItem;
  switch (rating) {
    case Rating.Again:
      scheduled = recordLog[Rating.Again];
      break;
    case Rating.Hard:
      scheduled = recordLog[Rating.Hard];
      break;
    case Rating.Good:
      scheduled = recordLog[Rating.Good];
      break;
    case Rating.Easy:
      scheduled = recordLog[Rating.Easy];
      break;
    default:
      throw new Error(`Invalid rating: ${rating}`);
  }

  // Apply response-time modifier (v7)
  const modifier = calculateResponseTimeModifier(responseTimeMs);
  if (modifier !== 1.0) {
    const originalDays = scheduled.card.scheduled_days;
    const modifiedDays = Math.max(0.001, originalDays * modifier);

    scheduled.card.scheduled_days = modifiedDays;
    // Recalculate due date from review time + new interval
    scheduled.card.due = new Date(
      reviewTime.getTime() + modifiedDays * 24 * 60 * 60 * 1000
    );

    // Sync log entry so the stored scheduled_days matches the actual modified interval
    scheduled.log.scheduled_days = modifiedDays;

    console.log(
      `[FSRS] Applied ${modifier}x modifier for ${responseTimeMs}ms response. Interval: ${originalDays.toFixed(2)} -> ${modifiedDays.toFixed(2)} days`
    );
  }

  // Convert back to our format
  const fsrsUpdates = fromFSRSCard(scheduled.card);
  const updatedCard: DbCard = { ...dbCard, ...fsrsUpdates };

  // Create review log entry
  const reviewLog: DbReviewLog = {
    id: randomUUID(),
    cardId,
    rating,
    state: scheduled.log.state,
    scheduledDays: scheduled.log.scheduled_days,
    elapsedDays: scheduled.log.elapsed_days,
    review: reviewTime.toISOString(),
    createdAt: new Date().toISOString(),
    responseTimeMs,
    partialCreditScore: null, // Can be populated by caller if needed
    responseTimeModifier: modifier,
  };

  // Execute update + log insert + increment review count in a transaction
  const transaction = db.transaction(() => {
    cardQueries.update(cardId, fsrsUpdates);
    reviewLogQueries.insert(reviewLog);
    settingsQueries.increment("review_count");
  });
  transaction();

  // Return interval previews for all ratings
  const intervals = {
    again: recordLog[Rating.Again].card.scheduled_days,
    hard: recordLog[Rating.Hard].card.scheduled_days,
    good: recordLog[Rating.Good].card.scheduled_days,
    easy: recordLog[Rating.Easy].card.scheduled_days,
  };

  return { card: updatedCard, reviewLog, intervals };
}

/**
 * Get interval previews for a card without committing a review.
 * Useful for showing "Again (1m) / Good (1d) / Easy (3d)" on buttons.
 */
export function getIntervalPreviews(cardId: string): {
  again: number;
  hard: number;
  good: number;
  easy: number;
} {
  const cards = cardQueries.getAll();
  const dbCard = cards.find((c) => c.id === cardId);
  if (!dbCard) {
    throw new Error(`Card not found: ${cardId}`);
  }

  const now = new Date();
  const fsrsCard =
    dbCard.state === 0 ? createEmptyCard(now) : toFSRSCard(dbCard);

  const recordLog = fsrs.repeat(fsrsCard, now);

  return {
    again: recordLog[Rating.Again].card.scheduled_days,
    hard: recordLog[Rating.Hard].card.scheduled_days,
    good: recordLog[Rating.Good].card.scheduled_days,
    easy: recordLog[Rating.Easy].card.scheduled_days,
  };
}

/**
 * Format scheduled_days as human-readable interval.
 * Examples: "<1m", "10m", "1d", "3d", "2w", "1mo"
 */
export function formatInterval(scheduledDays: number): string {
  if (scheduledDays < 1 / 1440) {
    return "<1m";
  } else if (scheduledDays < 1 / 24) {
    // Less than 1 hour - show minutes
    const minutes = Math.round(scheduledDays * 24 * 60);
    return `${minutes}m`;
  } else if (scheduledDays < 1) {
    // Less than 1 day - show hours
    const hours = Math.round(scheduledDays * 24);
    return `${hours}h`;
  } else if (scheduledDays < 7) {
    // Less than a week - show days
    const days = Math.round(scheduledDays);
    return `${days}d`;
  } else if (scheduledDays < 30) {
    // Less than a month - show weeks
    const weeks = Math.round(scheduledDays / 7);
    return `${weeks}w`;
  } else if (scheduledDays < 365) {
    // Less than a year - show months
    const months = Math.round(scheduledDays / 30);
    return `${months}mo`;
  } else {
    // Show years
    const years = Math.round(scheduledDays / 365);
    return `${years}y`;
  }
}

/**
 * Check if the number of reviews has reached a threshold that justifies
 * running the FSRS Maximum Likelihood Estimation (MLE) optimization.
 *
 * FSRS usually requires ~400 reviews for stable parameter estimation.
 */
export function shouldTriggerOptimization(): boolean {
  const countStr = settingsQueries.get("review_count") || "0";
  const count = parseInt(countStr, 10);

  // Trigger at 400 reviews, then every 100 reviews thereafter
  return count >= 400 && count % 100 === 0;
}

// Re-export Rating enum for use in IPC handlers
export { Rating };
