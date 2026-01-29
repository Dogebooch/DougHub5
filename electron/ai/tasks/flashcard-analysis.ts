/**
 * AI Task: Flashcard Analysis
 *
 * "The Zero-Click Analysis Trigger"
 *
 * Performs 3 parallel checks in one prompt:
 * 1. Gap Classification (Why did I miss this?)
 * 2. Worthiness Score (Is this high yield?)
 * 3. Interference Check (Is this a duplicate?)
 * 4. Draft Generation (The "Hero Card")
 */

import type {
  AITaskConfig,
  FlashcardAnalysisContext,
  FlashcardAnalysisResult,
} from "./types";

export const flashcardAnalysisTask: AITaskConfig<
  FlashcardAnalysisContext,
  FlashcardAnalysisResult
> = {
  id: "flashcard-analysis",
  name: "Flashcard Analysis",
  description: "Integrated analysis for QBank misses (Gap, Worthiness, Draft)",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.3, // Low temp for consistent classification
  maxTokens: 1000,
  timeoutMs: 20000, // 20s timeout
  cacheTTLMs: 0, // Do not cache analysis of specific mistakes

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education expert. Analyze this failed QBank question to help a student learn.

Your Goal: Produce a "Zero-Click" analysis that includes:
1. GAP DIAGNOSIS: Why did they miss it? (Pure Recall, Integration Failure, etc.)
2. WORTHINESS: Is this worth a flashcard (0-10)? (High yield for boards vs niche trivia)
3. INTERFERENCE: Does this contradict their existing knowledge base?
4. DRAFT CARD: A single, high-yield flashcard (front/back) addressing the specific gap.

Gap Types:
- PURE_RECALL: "I didn't know the fact." (e.g. forgot a drug name)
- PARTIAL_RECALL: "I knew part of it but forgot the specific detail."
- INTERFERENCE: "I confused X with Y."
- INTEGRATION_FAILURE: "I knew the facts but couldn't connect them." (common in vignettes)
- MISREAD: "I missed the word 'NOT' or 'EXCEPT'." (Score worthiness as 0)

Worthiness Rubric (0-10):
- 8-10: High Yield. Core concept tested frequently (e.g., "First line treatment for Community Acquired Pneumonia").
- 5-7: Medium Yield. Important details but less central.
- 0-4: Low Yield. Niche trivia, specific percentages, or "Misread" errors.

Output JSON ONLY. No markdown.`,

  buildUserPrompt: ({
    stem,
    userAnswer,
    correctAnswer,
    explanation,
    top3VectorMatches,
    userRole,
  }: FlashcardAnalysisContext) => `USER CONTEXT: ${userRole || "Medical Student"}

QUESTION STEM:
${stem}

USER ANSWER: ${userAnswer}
CORRECT ANSWER: ${correctAnswer}

EXPLANATION SUMMARY:
${explanation}

EXISTING SIMILAR CARDS (Check for duplicates/interference):
${top3VectorMatches}

INSTRUCTIONS:
1. Diagnose the Gap Type based on the difference between User Answer and Correct Answer.
2. Score Worthiness (0-10).
3. Check Interference: Do existing cards cover this specific fact?
4. Draft the Card: Front = Clinical question/scenario, Back = The specific missing fact.

OUTPUT JSON:
{
  "gapAnalysis": {
    "type": "PURE_RECALL" | "PARTIAL_RECALL" | "INTERFERENCE" | "INTEGRATION_FAILURE" | "MISREAD",
    "confidence": 0.0-1.0,
    "reasoning": "One sentence explanation"
  },
  "worthiness": {
    "score": number, // 0-10
    "rationale": "High yield because..."
  },
  "interference": {
    "isDuplicate": boolean,
    "similarityNote": "Matches 'X' but tests different fact" or "Direct duplicate of..."
  },
  "draftCard": {
    "front": "string",
    "back": "string"
  }
}`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (parsed: FlashcardAnalysisResult | null): FlashcardAnalysisResult => {
    const fallback: FlashcardAnalysisResult = {
      gapAnalysis: { type: "PURE_RECALL", confidence: 0.5, reasoning: "Fallback analysis" },
      worthiness: { score: 5, rationale: "Manual review required" },
      interference: { isDuplicate: false, similarityNote: "None" },
      draftCard: { front: "Manual Entry Required", back: "" },
      usedFallback: true,
    };

    if (!parsed) return fallback;

    return {
      gapAnalysis: {
        type: parsed.gapAnalysis?.type || "PURE_RECALL",
        confidence: typeof parsed.gapAnalysis?.confidence === 'number' ? parsed.gapAnalysis.confidence : 0.8,
        reasoning: parsed.gapAnalysis?.reasoning || "Analysis complete",
      },
      worthiness: {
        score: typeof parsed.worthiness?.score === 'number' ? parsed.worthiness.score : 5,
        rationale: parsed.worthiness?.rationale || "No rationale provided",
      },
      interference: {
        isDuplicate: !!parsed.interference?.isDuplicate,
        similarityNote: parsed.interference?.similarityNote || "No interference detected",
      },
      draftCard: {
        front: parsed.draftCard?.front || "Error generating front",
        back: parsed.draftCard?.back || "Error generating back",
      },
    };
  },

  fallbackResult: {
    gapAnalysis: {
      type: "PURE_RECALL",
      confidence: 0,
      reasoning: "AI Service Failed",
    },
    worthiness: {
      score: 0,
      rationale: "Service Unavailable",
    },
    interference: {
      isDuplicate: false,
      similarityNote: "Service Unavailable",
    },
    draftCard: {
      front: "Error generating card",
      back: "Please check AI service connection",
    },
    usedFallback: true,
  },
};
