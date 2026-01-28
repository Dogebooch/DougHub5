import type { ActivationStatus, ActivationTier, IntakeQuizResultType } from '@/types';

/**
 * Result of an activation decision process
 */
export interface ActivationDecision {
  /** Which tier the card falls into */
  tier: ActivationTier;
  /** The resulting activation status for the card */
  status: ActivationStatus;
  /** Human-readable reasons for this decision */
  reasons: string[];
  /** Confidence score (0-1) representing how certain the system is about this tier */
  confidence: number;
}

/**
 * Contextual data required to determine the activation tier of a card
 */
export interface ActivationContext {
  /** User's quiz result for this specific fact/card */
  quizResult: IntakeQuizResultType | null;
  /** The content of the fact being evaluated (used for signal detection) */
  factContent: string;
  /** Whether the original source (e.g., Qbank question) was answered incorrectly */
  sourceWasIncorrect: boolean;
  /** Number of other distinct sources containing similar content (frequency signal) */
  crossSourceCount?: number;
  /** Whether the user has a documented history of confusing this concept */
  hasConfusionPattern?: boolean;
  /** The name of the concept it is frequently confused with */
  confusedWithConcept?: string;
  /** Percentage of peers who answered this correctly (0-1) */
  peerCorrectRate?: number;
}

/**
 * Core logic to determine which activation tier a card belongs to.
 * 
 * Logic Tiers:
 * 1. AUTO-ACTIVE: Wrong/Skipped answer + at least one strong signal.
 * 2. SUGGESTED: Wrong/Skipped answer but no clinical/difficulty signals.
 * 3. DORMANT: Correct answer (proven knowledge) or no signals/quiz data.
 * 
 * @param context - The context containing quiz results and clinical signals
 * @returns ActivationDecision containing the suggested tier, status, and reasons
 */
export function determineActivationTier(context: ActivationContext): ActivationDecision {
  // TIER 3: DORMANT - User knows this
  if (context.quizResult === 'correct') {
    return {
      tier: 'user_manual',
      status: 'dormant',
      reasons: ['You knew this'],
      confidence: 0.9
    };
  }

  // Collect auto-activate signals
  const signals: string[] = [];

  // Signal 1: Contains memorizable values (numbers, doses, etc.)
  if (containsNumbers(context.factContent)) {
    signals.push('Contains numbers/values (hard to memorize)');
  }

  // Signal 2: From a source the user got wrong (e.g., the original Qbank question)
  if (context.sourceWasIncorrect) {
    signals.push('From a question you got wrong');
  }

  // Signal 3: Cross-source frequency (tested multiple times across different items)
  if (context.crossSourceCount && context.crossSourceCount >= 2) {
    signals.push(`Tested in ${context.crossSourceCount} sources`);
  }

  // Signal 4: Confusion pattern detected (previously tracked errors)
  if (context.hasConfusionPattern && context.confusedWithConcept) {
    signals.push(`You confuse this with "${context.confusedWithConcept}"`);
  }

  // Signal 5: High difficulty (low peer correct rate)
  if (context.peerCorrectRate !== undefined && context.peerCorrectRate < 0.5) {
    signals.push(`Only ${Math.round(context.peerCorrectRate * 100)}% of peers get this`);
  }

  // TIER 1: AUTO-ACTIVE - Wrong/skipped AND has signals
  if ((context.quizResult === 'wrong' || context.quizResult === 'skipped') && signals.length > 0) {
    return {
      tier: 'auto',
      status: 'active',
      reasons: signals,
      confidence: Math.min(0.5 + signals.length * 0.15, 0.95)
    };
  }

  // TIER 2: SUGGESTED - Wrong/skipped but no signals
  if (context.quizResult === 'wrong' || context.quizResult === 'skipped') {
    return {
      tier: 'suggested',
      status: 'suggested',
      reasons: ['You missed this, but may not need drilling'],
      confidence: 0.4
    };
  }

  // Default: DORMANT (no quiz taken or null result)
  return {
    tier: 'user_manual',
    status: 'dormant',
    reasons: ['No activation signals'],
    confidence: 0.3
  };
}

/**
 * Detects if clinical text contains high-yield memorizable numeric values.
 * Identifies percentages, doses, ranges, and multi-digit numbers.
 * 
 * @param text - The content to analyze
 * @returns boolean true if memorizable numbers are found
 */
export function containsNumbers(text: string): boolean {
  if (!text) return false;
  
  const patterns = [
    /\d+%/,                            // Percentages: 50%, 85%
    /\d+\s*(mg|mL|mcg|g|kg|mm|cm|L|mEq|mmol)/i, // Doses/measurements
    /\d+[-–]\d+/,                      // Ranges: 60-65, 120–180
    /\b\d{2,}\b/,                      // Numbers 10+ (not single digits)
    /\d+,\d{3}/,                       // Numbers with commas: 1,000
    /\d+\s*\/\s*\d+/,                  // Fractions/ratios: 1/3, 2/4
    /\d+:\d+/,                         // Ratios: 3:1, 15:1
  ];
  return patterns.some(p => p.test(text));
}

/**
 * Calculates a priority score (0-100) for UI sorting and visual urgency.
 * 
 * @param quizResult - Result of the intake quiz
 * @param signals - List of signals determined by the activation logic
 * @returns number 0-100 indicating relative priority
 */
export function calculatePriorityScore(
  quizResult: IntakeQuizResultType | null,
  signals: string[]
): number {
  let score = 50; // Base score

  if (quizResult === 'wrong') score += 25;
  else if (quizResult === 'skipped') score += 15;
  else if (quizResult === 'correct') score -= 30;

  // Each clinical signal adds priority
  score += signals.length * 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Maps an ActivationDecision to the corresponding database fields for a Card.
 * Useful for initializing or updating card objects during the quiz flow.
 * 
 * @param decision - The decision object from determineActivationTier
 * @returns Object containing status, tier, and reasons formatted for Card storage
 */
export function activationToCardFields(decision: ActivationDecision): {
  activationStatus: ActivationStatus;
  activationTier: ActivationTier;
  activationReasons: string[];
} {
  return {
    activationStatus: decision.status,
    activationTier: decision.tier,
    activationReasons: decision.reasons,
  };
}
