import { SuspendReason } from '@/types';

/** 
 * Leech threshold - lower than Anki's 8 for busy medical residents.
 * A card is considered a "leech" if it has been forgotten/lapsed this many times.
 */
export const LEECH_THRESHOLD = 6;

/**
 * Result of a leech check calculation
 */
export interface LeechCheckResult {
  /** Whether the card has reached the leech threshold */
  isLeech: boolean;
  /** The current number of lapses recorded */
  lapseCount: number;
  /** The threshold used for the check */
  threshold: number;
  /** Suggested action for the UI to present to the user */
  suggestedAction: 'continue' | 'rewrite' | 'delete' | 'suspend';
  /** Human-readable message explaining the status */
  message?: string;
}

/**
 * Data required to display a leech notification in the UI
 */
export interface LeechNotification {
  type: 'leech_detected';
  /** Unique ID of the card */
  cardId: string;
  /** Preview text from the front of the card */
  cardFront: string;
  /** Number of times the card has lapsed */
  lapseCount: number;
  /** Message to show the user */
  message: string;
  /** Available actions for the user to take */
  actions: Array<'Rewrite Card' | 'Delete Card' | 'Keep Trying' | 'Suspend'>;
}

/**
 * Check if a card has become a leech based on lapse count.
 * 
 * @param lapseCount - The current number of lapses for the card
 * @returns LeechCheckResult with assessment and suggested actions
 */
export function checkForLeech(lapseCount: number): LeechCheckResult {
  const isLeech = lapseCount >= LEECH_THRESHOLD;

  return {
    isLeech,
    lapseCount,
    threshold: LEECH_THRESHOLD,
    suggestedAction: isLeech ? 'rewrite' : 'continue',
    message: isLeech
      ? `This card has been missed ${lapseCount} times. Consider rewriting or deleting it.`
      : undefined
  };
}

/**
 * Create a leech notification object for the UI.
 * Shortens long card text for cleaner display.
 * 
 * @param cardId - The unique identifier of the card
 * @param cardFront - The front text of the card for display
 * @param lapseCount - Current lapse count
 * @returns LeechNotification object
 */
export function createLeechNotification(
  cardId: string,
  cardFront: string,
  lapseCount: number
): LeechNotification {
  const truncatedFront = cardFront.length > 50
    ? cardFront.slice(0, 50) + '...'
    : cardFront;

  return {
    type: 'leech_detected',
    cardId,
    cardFront: truncatedFront,
    lapseCount,
    message: `Card suspended: "${truncatedFront}" - You've missed this ${lapseCount} times. Consider rewriting or deleting.`,
    actions: ['Rewrite Card', 'Delete Card', 'Keep Trying', 'Suspend']
  };
}

/**
 * Determine if a card should be auto-suspended after a lapse.
 * Called after each failed review to decide if the card should be pulled from the queue.
 * 
 * @param currentLapses - Number of lapses before this review
 * @param newLapse - Whether the current review was a lapse (rating 1)
 * @returns Object indicating if card should be suspended and the reason
 */
export function shouldAutoSuspend(
  currentLapses: number,
  newLapse: boolean
): { suspend: boolean; reason?: SuspendReason } {
  const totalLapses = newLapse ? currentLapses + 1 : currentLapses;

  if (totalLapses >= LEECH_THRESHOLD) {
    return { suspend: true, reason: 'leech' };
  }

  return { suspend: false };
}

/**
 * Get the fields to update when suspending a card as a leech.
 * Maps directly to the Card database fields.
 * 
 * @returns Object containing activationStatus, suspendReason and suspendedAt timestamp
 */
export function getLeechSuspendFields(): {
  activationStatus: 'suspended';
  suspendReason: 'leech';
  suspendedAt: string;
} {
  return {
    activationStatus: 'suspended',
    suspendReason: 'leech',
    suspendedAt: new Date().toISOString()
  };
}
