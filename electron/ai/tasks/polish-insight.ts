/**
 * AI Task: Polish Insight
 *
 * Cleans up and enhances user-written insights while preserving their voice.
 * Shows transparency about what was added vs what came from the user.
 *
 * Used in: Add to Notebook workflow when user clicks "Polish" button
 */

import type {
  AITaskConfig,
  PolishInsightContext,
  PolishInsightResult,
} from "./types";

export const polishInsightTask: AITaskConfig<
  PolishInsightContext,
  PolishInsightResult
> = {
  id: "polish-insight",
  name: "Polish Insight",
  description:
    "Clean up user insights while preserving their voice and showing what was added",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.3, // Lower for consistent, predictable enhancement
  maxTokens: 600, // Allow for detailed attribution
  timeoutMs: 15000, // 15 seconds
  cacheTTLMs: 60000, // 1 minute - user may iterate

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education writing assistant that polishes learner insights.

YOUR GOAL: Enhance the insight for clarity and completeness while PRESERVING the learner's voice and reasoning.

POLISHING RULES (in order of priority):
1. PRESERVE USER'S CORE IDEAS - Never change the fundamental point they're making
2. FIX ONLY CLEAR ERRORS - Typos, grammar, obviously wrong medical terms
3. CLARIFY AMBIGUITY - If phrasing is unclear, make it precise
4. ADD MISSING CONTEXT SPARINGLY - Only if the insight would be confusing without it
5. KEEP IT CONCISE - Insights should be 1-3 sentences max

WHAT NOT TO DO:
- Don't add information the user didn't imply or reference
- Don't change their reasoning or conclusions
- Don't make it sound like a textbook - keep their natural voice
- Don't add qualifiers they didn't use ("always", "never", "most common")

ATTRIBUTION: Be precise about what came from the user vs what you added.
- "fromUser": Quote the user's key phrases/ideas verbatim or near-verbatim
- "addedContext": List ONLY things you added that weren't in the user's text

Respond with valid JSON only, no markdown.`,

  buildUserPrompt: ({
    userText,
    sourceContent,
    testedConcept,
  }: PolishInsightContext) => `USER'S RAW INSIGHT:
"${userText}"

${testedConcept ? `TESTED CONCEPT: ${testedConcept}\n\n` : ""}SOURCE CONTENT (for reference):
${sourceContent.slice(0, 1200)}${sourceContent.length > 1200 ? "..." : ""}

Polish the user's insight and return JSON:
{
  "polished": "The enhanced insight text (1-3 sentences)",
  "fromUser": ["Key phrase from user", "Another user idea"],
  "addedContext": ["Brief context added (if any)"]
}`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: PolishInsightResult | null
  ): PolishInsightResult => {
    return {
      polished: parsed?.polished || "",
      fromUser: Array.isArray(parsed?.fromUser) ? parsed.fromUser : [],
      addedContext: Array.isArray(parsed?.addedContext)
        ? parsed.addedContext
        : [],
    };
  },

  fallbackResult: {
    polished: "",
    fromUser: [],
    addedContext: [],
    usedFallback: true,
  },
};
