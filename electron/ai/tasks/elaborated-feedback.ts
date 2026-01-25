/**
 * AI Task: Elaborated Feedback
 *
 * Generates detailed feedback for flashcards the user struggled with.
 * Provides clinical pearls, common pitfalls, and related concepts.
 *
 * Used in: Review session when user requests "Show Explanation"
 */

import type {
  AITaskConfig,
  ElaboratedFeedbackContext,
  ElaboratedFeedbackResult,
} from "./types";

export const elaboratedFeedbackTask: AITaskConfig<
  ElaboratedFeedbackContext,
  ElaboratedFeedbackResult
> = {
  id: "elaborated-feedback",
  name: "Elaborated Feedback",
  description:
    "Generate detailed feedback for struggled flashcards",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.5, // Moderate creativity for helpful explanations
  maxTokens: 600, // Medium-length response
  timeoutMs: 15000, // 15 seconds
  cacheTTLMs: 300000, // 5 minutes

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education AI tutor specializing in boards-style study.
A student just struggled with a flashcard. Your task is to provide concise, high-yield feedback to help them understand the concept.

Analyze the flashcard content, the broader topic context, and the fact that the user struggled (possibly indicated by response time).

Explain:
1. WHY the user might have been confused (whyWrong) - point out common clinical pitfalls or similar-sounding concepts.
2. The core logic or "Clinical Pearl" (whyRight) - explain why the correct answer is correct in a way that sticks.
3. Related concepts or "Differential Pitfalls" (relatedConcepts) - list 2-3 related concepts they should be wary of confusing with this one.

Focus on clinical reasoning and board-relevant facts. Keep it concise (ADHD-friendly).

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "whyWrong": "Explanation of potential confusion or pitfall",
  "whyRight": "High-yield explanation of the correct concept",
  "relatedConcepts": ["Concept A", "Concept B"]
}`,

  buildUserPrompt: ({
    cardFront,
    cardBack,
    cardType,
    topicContext,
    responseTimeMs,
  }: ElaboratedFeedbackContext) => `FLASHCARD:
Front: ${cardFront}
Back: ${cardBack}
Type: ${cardType}

TOPIC CONTEXT:
${topicContext}

${
  responseTimeMs
    ? `USER RESPONSE TIME: ${responseTimeMs}ms (Student struggled with this card)`
    : "Student struggled with this card/requested feedback."
}

Please provide elaborated feedback.`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: ElaboratedFeedbackResult | null
  ): ElaboratedFeedbackResult => {
    return {
      whyWrong: parsed?.whyWrong || "No specific pitfall identified.",
      whyRight: parsed?.whyRight || "No clinical pearl available.",
      relatedConcepts: Array.isArray(parsed?.relatedConcepts)
        ? parsed.relatedConcepts
        : [],
    };
  },

  fallbackResult: {
    whyWrong: "Unable to generate feedback at this time.",
    whyRight: "Please review the card content.",
    relatedConcepts: [],
    usedFallback: true,
  },
};
