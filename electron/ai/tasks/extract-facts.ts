/**
 * AI Task: Extract Facts
 *
 * Parses source content into discrete, testable facts for the Intake Quiz system.
 * Each fact includes a key term that can be blanked for quiz generation.
 *
 * Part of Notebook v2 (v24) - Intake Quiz System
 */

import type {
  AITaskConfig,
  ExtractFactsContext,
  ExtractFactsResult,
  ExtractedFact,
} from "./types";

export const extractFactsTask: AITaskConfig<
  ExtractFactsContext,
  ExtractFactsResult
> = {
  id: "extract-facts",
  name: "Extract Facts",
  description:
    "Parse source content into discrete testable facts for quiz generation",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.2, // Low for consistent extraction
  maxTokens: 1500, // Multiple facts expected
  timeoutMs: 15000, // 15 seconds
  cacheTTLMs: 600000, // 10 minutes - stable content

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education expert extracting testable facts from clinical content.

TASK: Extract discrete, testable medical facts from the given content.

For each fact:
1. Identify a single specific clinical fact
2. Choose a KEY TERM that could be blanked for testing (drug name, threshold, condition, etc.)
3. Provide context sentence containing the fact
4. Rate importance: core (main teaching point), supporting (reinforces core), peripheral (tangential)

REQUIREMENTS:
- Each fact must test ONE retrievable piece of knowledge
- Key terms should be specific (e.g., "potassium" not "electrolyte")
- Facts must be verifiable from the source content
- Include 2-5 facts per source, prioritizing core facts

OUTPUT: Valid JSON only, matching the schema exactly.`,

  buildUserPrompt: ({
    sourceContent,
    sourceType,
    topicContext,
  }: ExtractFactsContext) => `
SOURCE TYPE: ${sourceType}
${topicContext ? `TOPIC CONTEXT: ${topicContext}` : ""}

CONTENT:
${sourceContent.slice(0, 3000)}${sourceContent.length > 3000 ? "..." : ""}

Extract testable facts. For each fact, identify a key term that would make a good quiz blank.

{
  "facts": [
    {
      "factText": "Complete fact statement",
      "keyTerm": "The specific term to blank",
      "context": "Sentence showing how the fact is used",
      "importance": "core" | "supporting" | "peripheral"
    }
  ]
}

Focus on:
- Drug names, dosages, or mechanisms
- Diagnostic thresholds or criteria
- Disease associations or distinguishing features
- Treatment algorithms or sequences
- Timing-sensitive clinical actions
  `.trim(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (parsed: ExtractFactsResult | null): ExtractFactsResult => {
    if (!parsed?.facts || !Array.isArray(parsed.facts)) {
      return { facts: [], usedFallback: true };
    }

    const validFacts: ExtractedFact[] = parsed.facts
      .filter(
        (f) =>
          f &&
          typeof f.factText === "string" &&
          typeof f.keyTerm === "string" &&
          f.factText.length > 0 &&
          f.keyTerm.length > 0,
      )
      .map((f) => ({
        factText: f.factText,
        keyTerm: f.keyTerm,
        context: f.context || f.factText,
        importance:
          f.importance &&
          ["core", "supporting", "peripheral"].includes(f.importance)
            ? f.importance
            : "supporting",
      }));

    return { facts: validFacts };
  },

  fallbackResult: {
    facts: [],
    usedFallback: true,
  },
};
