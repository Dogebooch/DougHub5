/**
 * AI Task: Tag Suggestion
 *
 * Suggests relevant medical domain tags for content organization.
 * Analyzes content and suggests tags from predefined categories.
 *
 * Used in: Content capture, note organization
 */

import type {
  AITaskConfig,
  TagSuggestionContext,
  TagSuggestionResult,
} from "./types";

export const tagSuggestionTask: AITaskConfig<
  TagSuggestionContext,
  TagSuggestionResult
> = {
  id: "tag-suggestion",
  name: "Tag Suggestion",
  description: "Suggest relevant medical domain tags for content",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.3, // Consistent tagging
  maxTokens: 300, // Compact response
  timeoutMs: 10000, // 10 seconds
  cacheTTLMs: 300000, // 5 minutes - content doesn't change

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education AI assistant that suggests relevant tags for medical content.
Analyze the content and suggest 2-5 tags from these categories:

Medical Specialties:
cardiology, pulmonology, gastroenterology, nephrology, neurology, endocrinology,
rheumatology, hematology, oncology, infectious-disease, dermatology, psychiatry,
emergency-medicine, critical-care, pediatrics, obstetrics, surgery

Foundational Sciences:
anatomy, physiology, pathology, pharmacology, biochemistry, microbiology, immunology

Content Types:
diagnosis, treatment, mechanism, epidemiology, pathophysiology, clinical-presentation,
differential-diagnosis, procedure, algorithm, lab-interpretation

Only suggest tags that are directly relevant to the content.
Prefer specific tags over general ones (e.g., "cardiology" over "medicine").

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "tags": ["tag1", "tag2", "tag3"]
}`,

  buildUserPrompt: ({ content }: TagSuggestionContext) =>
    `Suggest relevant medical tags for this content:\n\n${content}`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (parsed: TagSuggestionResult | null): TagSuggestionResult => {
    const tags = Array.isArray(parsed?.tags) ? parsed.tags : [];
    return {
      tags: tags
        .map((tag) => tag.toLowerCase().trim())
        .filter((tag) => tag.length > 0)
        .slice(0, 5), // Limit to 5 tags
    };
  },

  fallbackResult: {
    tags: [],
    usedFallback: true,
  },
};
