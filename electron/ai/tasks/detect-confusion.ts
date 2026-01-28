/**
 * AI Task: Detect Confusion
 *
 * Identifies when a user has confused two similar medical concepts.
 * Used to track confusion patterns and generate disambiguation cards.
 *
 * Part of Notebook v2 (v24) - Confusion Pattern Detection
 */

import type {
  AITaskConfig,
  DetectConfusionContext,
  DetectConfusionResult,
} from "./types";

export const detectConfusionTask: AITaskConfig<
  DetectConfusionContext,
  DetectConfusionResult
> = {
  id: "detect-confusion",
  name: "Detect Confusion",
  description:
    "Identify when user confuses similar medical concepts for pattern tracking",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.2, // Low for consistent detection
  maxTokens: 400, // Short analysis
  timeoutMs: 10000, // 10 seconds
  cacheTTLMs: 300000, // 5 minutes

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education expert detecting concept confusion patterns.

TASK: Determine if the user's incorrect answer indicates confusion between similar concepts.

CONFUSION PATTERNS TO DETECT:
1. Drug class confusion (e.g., loop diuretics vs thiazides)
2. Similar-sounding terms (e.g., methotrexate vs methylnaltrexone)
3. Same category, different indication (e.g., ACE-I for HTN vs heart failure)
4. Diagnostic criteria mixups (e.g., SIRS vs sepsis criteria)
5. Mechanism confusion (e.g., competitive vs non-competitive inhibition)
6. Timing/sequence errors (e.g., which comes first in a protocol)

NOT CONFUSION (just wrong):
- Random guesses
- Complete blanks
- Unrelated concepts

OUTPUT: Valid JSON indicating if confusion was detected and the concept pair.`,

  buildUserPrompt: ({
    userAnswer,
    correctAnswer,
    topicContext,
    relatedConcepts = [],
  }: DetectConfusionContext) => `
TOPIC CONTEXT: ${topicContext}

CORRECT ANSWER: ${correctAnswer}
USER'S WRONG ANSWER: ${userAnswer}
${relatedConcepts.length > 0 ? `RELATED CONCEPTS IN THIS TOPIC: ${relatedConcepts.join(", ")}` : ""}

Analyze if this wrong answer indicates confusion between two specific concepts.

{
  "hasConfusion": true/false,
  "confusedWith": "The concept they seem to have confused it with (if applicable)",
  "confusionReason": "Why this is a common confusion (if applicable)",
  "conceptPair": {
    "conceptA": "First concept in the confusion pair",
    "conceptB": "Second concept in the confusion pair"
  }
}

Only set hasConfusion=true if there's a clear conceptual relationship between what they answered and the correct answer. Random wrong answers are NOT confusion.
  `.trim(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: DetectConfusionResult | null,
  ): DetectConfusionResult => {
    if (!parsed) {
      return {
        hasConfusion: false,
        usedFallback: true,
      };
    }

    const result: DetectConfusionResult = {
      hasConfusion: Boolean(parsed.hasConfusion),
    };

    if (parsed.hasConfusion) {
      if (parsed.confusedWith) {
        result.confusedWith = parsed.confusedWith;
      }
      if (parsed.confusionReason) {
        result.confusionReason = parsed.confusionReason;
      }
      if (
        parsed.conceptPair &&
        typeof parsed.conceptPair.conceptA === "string" &&
        typeof parsed.conceptPair.conceptB === "string"
      ) {
        result.conceptPair = {
          conceptA: parsed.conceptPair.conceptA,
          conceptB: parsed.conceptPair.conceptB,
        };
      }
    }

    return result;
  },

  fallbackResult: {
    hasConfusion: false,
    usedFallback: true,
  },
};
