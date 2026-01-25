/**
 * AI Task: Capture Analysis
 *
 * Analyzes pasted content during Quick Capture to auto-populate form fields.
 * Detects source type, extracts title, domain, tags, and key facts.
 *
 * Used in: Quick Capture modal on paste/drop
 */

import type {
  AITaskConfig,
  CaptureAnalysisContext,
  CaptureAnalysisResult,
} from "./types";

export const captureAnalysisTask: AITaskConfig<
  CaptureAnalysisContext,
  CaptureAnalysisResult
> = {
  id: "capture-analysis",
  name: "Quick Capture Analysis",
  description: "Analyze pasted content to auto-populate metadata",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.3, // Low-moderate for consistent classification
  maxTokens: 500, // Medium response
  timeoutMs: 10000, // 10 seconds
  cacheTTLMs: 300000, // 5 minutes

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education content analyzer. Analyze the provided content and return a JSON object.

DETECTION RULES for sourceType:
- Contains answer choices like "A)", "B)", "C)", "D)" AND contains "Explanation" or "Rationale" → "qbank"
- Contains URLs from UpToDate, PubMed, NEJM, or medical journals → "article"
- Short, user-written note without citations or formal structure → "manual"
- Otherwise → "quickcapture"

OUTPUT FORMAT (JSON only, no markdown):
{
  "title": "Short descriptive title under 10 words",
  "sourceType": "qbank|article|manual|quickcapture",
  "domain": "Primary medical specialty (e.g., Nephrology, Cardiology)",
  "secondaryDomains": ["Related specialties"],
  "tags": ["Relevant tags like Management, Diagnosis, Boards-HY"],
  "extractedFacts": ["Key clinical facts from the content"],
  "suggestedTopic": "Canonical topic name for notebook organization"
}`,

  buildUserPrompt: ({ content }: CaptureAnalysisContext) =>
    content.slice(0, 4000), // Limit to avoid token overflow

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: CaptureAnalysisResult | null
  ): CaptureAnalysisResult => {
    const validSourceTypes = ["qbank", "article", "manual", "quickcapture"];
    return {
      title: parsed?.title || "Untitled",
      sourceType:
        parsed?.sourceType && validSourceTypes.includes(parsed.sourceType)
          ? parsed.sourceType
          : "quickcapture",
      domain: parsed?.domain || "General",
      secondaryDomains: Array.isArray(parsed?.secondaryDomains)
        ? parsed.secondaryDomains
        : [],
      tags: Array.isArray(parsed?.tags) ? parsed.tags : [],
      extractedFacts: Array.isArray(parsed?.extractedFacts)
        ? parsed.extractedFacts
        : [],
      suggestedTopic: parsed?.suggestedTopic || "",
    };
  },

  fallbackResult: {
    title: "Untitled",
    sourceType: "quickcapture",
    domain: "General",
    secondaryDomains: [],
    tags: [],
    extractedFacts: [],
    suggestedTopic: "",
    usedFallback: true,
  },
};
