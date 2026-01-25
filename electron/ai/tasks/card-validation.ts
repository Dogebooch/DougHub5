/**
 * AI Task: Card Validation
 *
 * Validates flashcard quality based on the Minimum Information Principle.
 * Checks for atomic knowledge, clarity, and common issues.
 *
 * Used in: Card creation, card editing
 */

import type {
  AITaskConfig,
  CardValidationContext,
  CardValidationResult,
} from "./types";

export const cardValidationTask: AITaskConfig<
  CardValidationContext,
  CardValidationResult
> = {
  id: "card-validation",
  name: "Card Validation",
  description: "Validate flashcard quality and adherence to learning principles",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.2, // Very consistent validation
  maxTokens: 500, // Compact response
  timeoutMs: 10000, // 10 seconds
  cacheTTLMs: 60000, // 1 minute - user may edit

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education AI assistant that validates flashcard quality.
Evaluate cards based on the Minimum Information Principle:
1. Each card should test ONE atomic piece of knowledge
2. The question should be clear and unambiguous
3. The answer should be concise and directly address the question
4. Avoid compound questions or multiple answers

Check for common issues:
- Question too broad or vague
- Answer too long (>50 words suggests multiple concepts)
- Missing context needed for understanding
- Cloze deletions that are too easy or ambiguous

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "isValid": true,
  "warnings": ["Warning message if any"],
  "suggestions": ["Suggestion for improvement if any"]
}`,

  buildUserPrompt: ({ front, back, cardType }: CardValidationContext) => {
    const cardContent =
      cardType === "cloze"
        ? `Cloze card:\n${front}`
        : `Question: ${front}\nAnswer: ${back}`;
    return `Validate this ${cardType} flashcard:\n\n${cardContent}`;
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: CardValidationResult | null
  ): CardValidationResult => {
    return {
      isValid: parsed?.isValid ?? true,
      warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
      suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions : [],
    };
  },

  fallbackResult: {
    isValid: true,
    warnings: ["AI validation unavailable"],
    suggestions: [],
    usedFallback: true,
  },
};
