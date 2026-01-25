/**
 * AI Task: Card Generation
 *
 * Generates high-quality flashcards from notebook blocks.
 * Uses traffic-light worthiness system (green/yellow/red) for quality evaluation.
 *
 * Used in: Notebook topic pages, card generation workflow
 */

import type {
  AITaskConfig,
  CardGenerationContext,
  CardGenerationResult,
  CardGenerationSuggestion,
  WorthinessResult,
} from "./types";

export const cardGenerationTask: AITaskConfig<
  CardGenerationContext,
  CardGenerationResult
> = {
  id: "card-generation",
  name: "Card Generation",
  description: "Generate high-quality flashcards with worthiness evaluation",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.4, // Slightly creative for card phrasing
  maxTokens: 1500, // Room for multiple suggestions
  timeoutMs: 25000, // 25 seconds
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
- For lists, return a separate suggestion for EACH item in the list (overlapping clozes).
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
  "suggestions": [
    {
      "format": "qa|cloze|overlapping-cloze|image-occlusion|procedural",
      "front": "Front of card",
      "back": "Back of card (if applicable)",
      "confidence": 0.9,
      "worthiness": {
        "testable": "green|yellow|red",
        "oneConcept": "green|yellow|red",
        "discriminative": "green|yellow|red",
        "explanations": {
          "testable": "reason",
          "oneConcept": "reason",
          "discriminative": "reason"
        }
      },
      "formatReason": "Why this format was chosen"
    }
  ]
}`,

  buildUserPrompt: ({
    blockContent,
    topicContext,
    userIntent,
  }: CardGenerationContext) => `HIGHLIGHTED CONTENT:
${blockContent}

TOPIC CONTEXT:
${topicContext}

${userIntent ? `USER INTENT: ${userIntent}\n` : ""}Please generate high-quality card suggestions from the highlighted content.`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: CardGenerationResult | null
  ): CardGenerationResult => {
    // Handle both {suggestions: [...]} and direct array [...] formats
    let suggestions: CardGenerationSuggestion[];
    if (Array.isArray(parsed)) {
      suggestions = parsed as unknown as CardGenerationSuggestion[];
    } else if (parsed && Array.isArray(parsed.suggestions)) {
      suggestions = parsed.suggestions;
    } else {
      return { suggestions: [] };
    }

    const defaultWorthiness: WorthinessResult = {
      testable: "yellow",
      oneConcept: "yellow",
      discriminative: "yellow",
      explanations: {
        testable: "Auto-generated",
        oneConcept: "Auto-generated",
        discriminative: "Auto-generated",
      },
    };

    // Normalize and validate each suggestion
    const normalizedSuggestions = suggestions
      .map((s) => ({
        format: s.format || "qa",
        front: s.front || "",
        back: s.back || "",
        confidence: typeof s.confidence === "number" ? s.confidence : 0.8,
        worthiness: s.worthiness || defaultWorthiness,
        formatReason: s.formatReason || "AI suggestion",
      }))
      .filter((s) => {
        // Validate content quality: detect duplicate front/back
        if (s.front && s.back && s.front.trim() === s.back.trim()) {
          console.warn(`[Card Generation] Filtered duplicate card: front === back`);
          return false;
        }
        // Filter empty backs for qa/procedural cards
        if ((s.format === "qa" || s.format === "procedural") && !s.back?.trim()) {
          console.warn(`[Card Generation] Card with empty back for format ${s.format}`);
          return false;
        }
        return true;
      });

    return { suggestions: normalizedSuggestions as CardGenerationSuggestion[] };
  },

  fallbackResult: {
    suggestions: [],
    usedFallback: true,
  },
};
