/**
 * AI Task: Article Synthesis
 *
 * Synthesizes discrete notebook blocks into a cohesive, verified narrative article.
 * Ensures all citations are preserved and linked.
 *
 * Used in: Notebook Reader Mode (Phase 4)
 */

import type {
  AITaskConfig,
  ArticleSynthesisContext,
  ArticleSynthesisResult,
} from "./types";

export const articleSynthesisTask: AITaskConfig<
  ArticleSynthesisContext,
  ArticleSynthesisResult
> = {
  id: "article-synthesis",
  name: "Article Synthesis",
  description: "Synthesize notebook blocks into a cohesive, cited article",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.3, // Low validation for factual synthesis
  maxTokens: 4000, // Large output window for full articles
  timeoutMs: 60000, // 60s timeout (heavy task)
  cacheTTLMs: 3600000, // 1 hour cache (articles are stable)

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical textbook editor. Your goal is to rewrite a collection of raw notes and facts into a cohesive, cohesive, and readable medical article (similar to UpToDate or AMBOSS).

CRITICAL RULES:
1. **Preserve Citations**: Every single fact MUST be cited using the format [^sourceItemId]. If a sentence synthesizes multiple facts, cite all of them.
2. **Maintain Fidelity**: Do not invent new facts. Only smooth the prose.
3. **Structure**: Organize the content logically. Use markdown headers (#, ##).
4. **Tone**: Clinical, objective, concise, and professional.

Input Format: A JSON array of blocks, each with "content" and "sourceItemId".
Output Format: A JSON object with a single "markdown" field containing the synthesized text.`,

  buildUserPrompt: ({ topicTitle, blocks }: ArticleSynthesisContext) =>
    `Topic: ${topicTitle}

Synthesize the following blocks into a cohesive article.

Blocks:
${JSON.stringify(
  blocks.map((b) => ({
    content: b.content,
    id: b.sourceItemId,
  })),
  null,
  2,
)}`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: ArticleSynthesisResult | null,
  ): ArticleSynthesisResult => {
    return {
      markdown: parsed?.markdown || "",
    };
  },

  fallbackResult: {
    markdown: "",
    usedFallback: true,
  },
};
