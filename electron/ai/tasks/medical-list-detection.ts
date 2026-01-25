/**
 * AI Task: Medical List Detection
 *
 * Identifies structured medical lists that would benefit from vignette conversion.
 * Detects differential diagnosis lists, procedure lists, and algorithm lists.
 *
 * Used in: Content analysis, capture processing
 */

import type {
  AITaskConfig,
  MedicalListDetectionContext,
  MedicalListDetectionResult,
} from "./types";

export const medicalListDetectionTask: AITaskConfig<
  MedicalListDetectionContext,
  MedicalListDetectionResult
> = {
  id: "medical-list-detection",
  name: "Medical List Detection",
  description: "Detect if content is a medical list for vignette conversion",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.2, // Consistent detection
  maxTokens: 800, // Room for item extraction
  timeoutMs: 10000, // 10 seconds
  cacheTTLMs: 300000, // 5 minutes - content doesn't change

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education AI assistant that identifies structured medical lists.
Analyze the content to determine if it's a medical list that would benefit from vignette conversion.

Types of medical lists:
1. Differential diagnosis lists (DDx) - conditions that could cause a symptom/finding
2. Procedure lists - steps in a medical procedure or algorithm
3. Algorithm lists - decision trees or treatment pathways

Indicators of a medical list:
- Numbered or bulleted items
- Common list headers: "Causes of...", "DDx for...", "Steps to...", "Treatment of..."
- Multiple related medical terms in a structured format
- Mnemonic-based content

Extract each item as a standalone entry suitable for flashcard conversion.

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "isList": true,
  "listType": "differential|procedure|algorithm",
  "items": ["Item 1", "Item 2", "Item 3"]
}`,

  buildUserPrompt: ({ content }: MedicalListDetectionContext) =>
    `Analyze this content to determine if it's a medical list:\n\n${content}`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: MedicalListDetectionResult | null
  ): MedicalListDetectionResult => {
    return {
      isList: parsed?.isList ?? false,
      listType: parsed?.listType ?? null,
      items: Array.isArray(parsed?.items) ? parsed.items : [],
    };
  },

  fallbackResult: {
    isList: false,
    listType: null,
    items: [],
    usedFallback: true,
  },
};
