/**
 * AI Task: Concept Extraction
 *
 * Extracts key learning concepts from pasted medical content.
 * Identifies testable facts, definitions, mechanisms, and relationships.
 *
 * Used in: Quick capture, content analysis
 */

import type {
  AITaskConfig,
  ConceptExtractionContext,
  ConceptExtractionTaskResult,
} from "./types";

export const conceptExtractionTask: AITaskConfig<
  ConceptExtractionContext,
  ConceptExtractionTaskResult
> = {
  id: "concept-extraction",
  name: "Concept Extraction",
  description: "Extract key learning concepts from medical content",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.3, // Lower for consistent extraction
  maxTokens: 1500, // Room for multiple concepts
  timeoutMs: 20000, // 20 seconds
  cacheTTLMs: 300000, // 5 minutes - content doesn't change

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education AI assistant specializing in flashcard creation.
Your task is to extract key learning concepts from pasted medical content.

For each concept, identify:
1. The core fact, definition, mechanism, or relationship
2. The type of concept (definition, mechanism, differential, treatment, diagnostic, epidemiology)
3. Whether it's best as a Q&A card or cloze deletion
4. Your confidence level (0-1) based on clarity and importance

Guidelines:
- Focus on testable, discrete facts
- Prefer cloze for lists, sequences, and fill-in-the-blank content
- Prefer Q&A for "why" questions, mechanisms, and comparisons
- Extract 3-7 concepts per input, prioritizing high-yield content
- Skip trivial or obvious information

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "concepts": [
    {
      "text": "Description of the concept",
      "conceptType": "definition|mechanism|treatment|diagnosis|epidemiology",
      "confidence": 0.9,
      "suggestedFormat": "qa|cloze"
    }
  ]
}`,

  buildUserPrompt: ({ content }: ConceptExtractionContext) =>
    `Extract learning concepts from this medical content:\n\n${content}`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: ConceptExtractionTaskResult | null
  ): ConceptExtractionTaskResult => {
    // Handle both {concepts: [...]} and direct array [...] formats
    if (Array.isArray(parsed)) {
      return { concepts: parsed };
    }
    return {
      concepts: Array.isArray(parsed?.concepts) ? parsed.concepts : [],
    };
  },

  fallbackResult: {
    concepts: [],
    usedFallback: true,
  },
};
