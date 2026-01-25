/**
 * AI Task: Insight Evaluation
 *
 * Evaluates a learner's written insight against the source content.
 * Identifies knowledge gaps, provides constructive feedback, and classifies exam traps.
 *
 * Used in: Add to Notebook workflow when user clicks "Get Feedback"
 */

import type {
  AITaskConfig,
  InsightEvaluationContext,
  InsightEvaluationResult,
} from "./types";

export const insightEvaluationTask: AITaskConfig<
  InsightEvaluationContext,
  InsightEvaluationResult
> = {
  id: "insight-evaluation",
  name: "AI Insight Evaluation",
  description:
    "Evaluate learner insights for knowledge gaps and exam traps",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.3, // Moderate for balanced feedback
  maxTokens: 500, // Medium response length
  timeoutMs: 15000, // 15 seconds
  cacheTTLMs: 300000, // 5 minutes

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education expert evaluating a learner's written insight.
Your task is to identify knowledge gaps, provide constructive feedback, and flag potential concept confusions.
Always respond with valid JSON matching the schema exactly.`,

  buildUserPrompt: ({
    userInsight,
    sourceContent,
    isIncorrect,
    topicContext,
  }: InsightEvaluationContext) => {
    let prompt = `SOURCE CONTENT:
${sourceContent}

LEARNER'S INSIGHT:
${userInsight}

${topicContext ? `TOPIC CONTEXT: ${topicContext}\n` : ""}
Evaluate the insight and return JSON:
{
  "gaps": ["list of knowledge gaps or missing key points from the source"],
  "feedbackText": "Constructive feedback on the insight (2-3 sentences)",
  "confusionTags": ["any concept pairs that might be confused, e.g., 'Methotrexate vs Methylnaltrexone'"],
  "examTrapType": null
}`;

    if (isIncorrect) {
      prompt += `

The learner got this question WRONG. Classify the error type for examTrapType:
- "qualifier-misread": Misread qualifiers like 'most common' vs 'most common abnormality'
- "negation-blindness": Missed 'NOT' or 'EXCEPT' in question
- "age-population-skip": Missed population specifier (children, pregnant, elderly)
- "absolute-terms": Tricked by 'always', 'never', 'only' (usually wrong)
- "best-vs-correct": Picked correct but not BEST answer
- "timeline-confusion": Confused initial vs definitive management
- null: Knowledge gap, not an exam trap
Set examTrapType to the most likely error type, or null if it was a pure knowledge gap.`;
    }

    return prompt;
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: InsightEvaluationResult | null
  ): InsightEvaluationResult => {
    return {
      gaps: Array.isArray(parsed?.gaps) ? parsed.gaps : [],
      feedbackText: parsed?.feedbackText || "Insight processed.",
      confusionTags: Array.isArray(parsed?.confusionTags)
        ? parsed.confusionTags
        : [],
      examTrapType: parsed?.examTrapType || null,
      evaluatedAt: new Date().toISOString(),
    };
  },

  fallbackResult: {
    gaps: [],
    feedbackText: "Unable to evaluate insight at this time.",
    confusionTags: [],
    examTrapType: null,
    evaluatedAt: new Date().toISOString(),
    usedFallback: true,
  },
};
