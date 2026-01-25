/**
 * AI Task: Card Suggestion
 *
 * Generates high-quality flashcard suggestions from notebook blocks.
 * Evaluates card worthiness (testable, one-concept, discriminative).
 *
 * Used in: Card generation from notebook topic pages
 */

import type {
  AITaskConfig,
  CardSuggestionContext,
  CardSuggestionResult,
} from "./types";

export const cardSuggestionTask: AITaskConfig<
  CardSuggestionContext,
  CardSuggestionResult
> = {
  id: "card-suggestion",
  name: "Card Suggestion",
  description:
    "Suggest flashcard format and content from notebook blocks",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.4, // Slightly creative for card phrasing
  maxTokens: 800, // Larger for detailed suggestions
  timeoutMs: 20000, // 20 seconds
  cacheTTLMs: 60000, // 1 minute - user may iterate

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education AI assistant that generates high-quality flashcards.
Your goal is to transform the provided medical text into effective, testable, and discrete flashcards.

Worthiness Criteria (Evaluate each card):
1. TESTABLE: Does it have one clear correct answer? (fail: essays, open-ended)
2. ONE CONCEPT: Does it test exactly one retrievable fact? (fail: lists, multiple facts)
3. DISCRIMINATIVE: Does it distinguish from similar concepts? (fail: too generic)

Format Detection Heuristics:
- Procedural keywords (steps, procedure, technique, how to) → format: 'procedural' (use Q&A style)
- List patterns (numbered, "causes of", "types of") → format: 'overlapping-cloze' (generate one card per item)
- Image references or visual descriptions → format: 'image-occlusion' (describe what should be occluded)
- Single fact or definition → format: 'cloze' (use {{c1::answer}} syntax)
- Reasoning, comparison, or "why" questions → format: 'qa'

Guidelines:
- Put clinical scenarios into 'qa' or 'cloze' format.
- For lists, return a separate CardSuggestion for EACH item in the list (overlapping clozes).
- Use green/yellow/red for worthiness ratings.
- Provide brief, specific explanations for worthiness ratings.

CRITICAL for Clinical Vignettes/Patient Scenarios:
- FRONT: Patient demographics, clinical presentation, exam findings, labs (the scenario)
- BACK: Diagnosis, condition name, or specific answer being tested
- Use format: 'qa' (NOT cloze for vignettes)
- Example: front: "37yo woman with bilateral eye redness, photophobia, and pain. Found to have bilateral uveitis." back: "Anterior uveitis (requires urgent ophthalmology referral)"
- NEVER duplicate the scenario in both front and back

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "suggestedFormat": "qa|cloze|overlapping-cloze|image-occlusion|procedural",
  "front": "Front of card",
  "back": "Back of card (if applicable)",
  "clozeText": "Text with {{c1::cloze}} deletions (if cloze format)",
  "worthiness": {
    "isWorthy": true|false,
    "reason": "Brief explanation of worthiness assessment"
  }
}`,

  buildUserPrompt: ({
    blockContent,
    sourceContent,
    topicName,
  }: CardSuggestionContext) => `HIGHLIGHTED CONTENT:
${blockContent}

TOPIC: ${topicName}

SOURCE CONTEXT:
${sourceContent.slice(0, 1500)}${sourceContent.length > 1500 ? "..." : ""}

Generate a high-quality flashcard suggestion from the highlighted content.`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: CardSuggestionResult | null
  ): CardSuggestionResult => {
    const validFormats = ["basic", "cloze", "reversed"];
    return {
      suggestedFormat:
        parsed?.suggestedFormat &&
        validFormats.includes(parsed.suggestedFormat)
          ? parsed.suggestedFormat
          : "basic",
      front: parsed?.front || "",
      back: parsed?.back || "",
      clozeText: parsed?.clozeText,
      worthiness: {
        isWorthy: parsed?.worthiness?.isWorthy ?? false,
        reason: parsed?.worthiness?.reason || "Unable to assess worthiness",
      },
    };
  },

  fallbackResult: {
    suggestedFormat: "basic",
    front: "",
    back: "",
    worthiness: {
      isWorthy: false,
      reason: "AI evaluation unavailable",
    },
    usedFallback: true,
  },
};
