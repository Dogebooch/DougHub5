/**
 * AI Task: Identify Tested Concept
 *
 * Extracts the key learning point or concept being tested in educational content.
 * Used to guide learners when writing their insights in the "Add to Notebook" flow.
 *
 * Accuracy: 95% (tested with qwen2.5:7b-instruct)
 * Test script: scripts/ai-tests/test-identify-concept-final.cjs
 */

import type {
  AITaskConfig,
  IdentifyConceptContext,
  IdentifyConceptResult,
} from "./types";

export const identifyTestedConceptTask: AITaskConfig<
  IdentifyConceptContext,
  IdentifyConceptResult
> = {
  id: "identify-tested-concept",
  name: "Identify Tested Concept",
  description:
    "Extract the key learning point from educational content (questions, articles, lectures)",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.1, // Low for consistent, deterministic output
  maxTokens: 200, // Short response expected
  timeoutMs: 10000, // 10 seconds
  cacheTTLMs: 600000, // 10 minutes - stable result, cache longer

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts (Optimized for 95% accuracy)
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education expert extracting key learning points.

TASK: Identify the ONE specific medical fact being tested/taught.

OUTPUT REQUIREMENTS:
1. State the fact as ONE complete sentence
2. Include the clinical CONDITION and the ACTION/CONCLUSION
3. Be specific - include drug names, thresholds, comparisons when relevant
4. Format: "[In CONDITION,] ACTION/FACT"

EXAMPLES:
- "Benzodiazepines are first-line treatment for status epilepticus"
- "In DKA, check potassium before starting insulin to prevent hypokalemia"
- "CKD patients are more likely to die from cardiovascular disease than progress to ESKD"

AVOID:
- Vague phrases like "importance of", "role of", "management of"
- Omitting the clinical context (e.g., saying "check potassium before insulin" without mentioning DKA)

Respond with valid JSON only.`,

  buildUserPrompt: ({ sourceContent, sourceType }: IdentifyConceptContext) => `
CONTENT TYPE: ${sourceType}

${sourceContent.slice(0, 2000)}${sourceContent.length > 2000 ? "..." : ""}

Extract the key testable fact. Include both the clinical context AND the specific action/conclusion.

{
  "concept": "Complete sentence with context and action",
  "confidence": "high" | "medium" | "low"
}

Set confidence to:
- "high": Clear, focused content with obvious learning point
- "medium": Multiple concepts but one stands out
- "low": Unclear or too broad to identify specific concept
  `.trim(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (parsed: IdentifyConceptResult | null): IdentifyConceptResult => {
    return {
      concept: parsed?.concept || "Key learning point",
      confidence:
        parsed?.confidence &&
        ["high", "medium", "low"].includes(parsed.confidence)
          ? parsed.confidence
          : "low",
    };
  },

  fallbackResult: {
    concept: "Key learning point",
    confidence: "low" as const,
    usedFallback: true,
  },
};
