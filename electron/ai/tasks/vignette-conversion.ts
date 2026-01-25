/**
 * AI Task: Vignette Conversion
 *
 * Converts medical list items into clinical vignettes and cloze deletions.
 * Transforms raw list items into realistic patient scenarios.
 *
 * Used in: Medical list processing, overlapping cloze generation
 */

import type {
  AITaskConfig,
  VignetteConversionContext,
  VignetteConversionResult,
} from "./types";

export const vignetteConversionTask: AITaskConfig<
  VignetteConversionContext,
  VignetteConversionResult
> = {
  id: "vignette-conversion",
  name: "Vignette Conversion",
  description: "Convert medical list items to clinical vignettes",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.5, // More creative for vignette generation
  maxTokens: 600, // Room for vignette + cloze
  timeoutMs: 15000, // 15 seconds
  cacheTTLMs: 300000, // 5 minutes - content doesn't change

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education AI assistant that converts medical list items into clinical vignettes.
Your task is to transform a list item into a realistic patient scenario that tests the same knowledge.

Guidelines for vignette creation:
1. Include realistic patient demographics (age, sex when relevant)
2. Present clinical findings that logically point to the answer
3. Use "A X-year-old patient presents with..." format
4. Include key history, physical exam, or lab findings
5. Make each vignette independently answerable without needing sibling context
6. Avoid giving away the answer in the presentation
7. Keep vignettes concise (2-4 sentences)

For the cloze version:
- Create a fill-in-the-blank statement using {{c1::answer}} format
- The cloze should test the same concept as the vignette

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "vignette": "A X-year-old patient presents with...",
  "cloze": "The most likely diagnosis is {{c1::answer}}"
}`,

  buildUserPrompt: ({ listItem, context }: VignetteConversionContext) => {
    if (context) {
      return `Convert this medical list item to a clinical vignette.\n\nContext: ${context}\nItem: ${listItem}`;
    }
    return `Convert this medical list item to a clinical vignette.\n\nItem: ${listItem}`;
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: VignetteConversionResult | null
  ): VignetteConversionResult => {
    if (!parsed?.vignette || !parsed?.cloze) {
      throw new Error("Invalid vignette conversion response");
    }
    return {
      vignette: parsed.vignette,
      cloze: parsed.cloze,
    };
  },

  // No fallback - vignette conversion should fail explicitly
  // This is intentional: the caller can handle the error
};
