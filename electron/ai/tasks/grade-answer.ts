/**
 * AI Task: Grade Answer
 *
 * Performs fuzzy matching to grade user answers against correct answers.
 * Handles synonyms, abbreviations, and partial matches.
 *
 * Part of Notebook v2 (v24) - Intake Quiz System
 */

import type {
  AITaskConfig,
  GradeAnswerContext,
  GradeAnswerResult,
} from "./types";

export const gradeAnswerTask: AITaskConfig<
  GradeAnswerContext,
  GradeAnswerResult
> = {
  id: "grade-answer",
  name: "Grade Answer",
  description: "Fuzzy match user answers against correct answers for quiz grading",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.1, // Very low - we need consistent grading
  maxTokens: 300, // Short response
  timeoutMs: 8000, // 8 seconds - needs to be fast for quiz flow
  cacheTTLMs: 60000, // 1 minute - answers may vary

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education grading assistant performing semantic answer matching.

TASK: Determine if the user's answer is semantically equivalent to the correct answer.

ACCEPT as correct:
- Exact matches (case-insensitive)
- Medical synonyms (e.g., "benzos" = "benzodiazepines")
- Common abbreviations (e.g., "K+" = "potassium")
- Spelling variations within reason
- Partial matches that demonstrate understanding (e.g., "lorazepam" when answer is "benzodiazepines" - specific example of class)

REJECT as incorrect:
- Different concepts entirely
- Opposite meanings
- Related but distinct terms (e.g., "sodium" when answer is "potassium")

OUTPUT: Valid JSON only, with match score 0-1 and explanation.`,

  buildUserPrompt: ({
    userAnswer,
    correctAnswer,
    acceptableAnswers,
    questionContext,
  }: GradeAnswerContext) => `
QUESTION CONTEXT: ${questionContext}

CORRECT ANSWER: ${correctAnswer}
${acceptableAnswers.length > 0 ? `ALSO ACCEPTABLE: ${acceptableAnswers.join(", ")}` : ""}

USER'S ANSWER: ${userAnswer}

Grade this answer:

{
  "isCorrect": true/false,
  "matchScore": 0.0-1.0,
  "feedback": "Brief explanation of grading decision",
  "closestMatch": "If wrong, which correct answer was closest (optional)"
}

matchScore guide:
- 1.0: Exact or perfect semantic match
- 0.8-0.9: Acceptable synonym or abbreviation
- 0.5-0.7: Partially correct or related
- 0.0-0.4: Incorrect
  `.trim(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (parsed: GradeAnswerResult | null): GradeAnswerResult => {
    if (!parsed) {
      return {
        isCorrect: false,
        matchScore: 0,
        feedback: "Unable to grade answer",
        usedFallback: true,
      };
    }

    return {
      isCorrect: Boolean(parsed.isCorrect),
      matchScore:
        typeof parsed.matchScore === "number"
          ? Math.max(0, Math.min(1, parsed.matchScore))
          : parsed.isCorrect
            ? 1
            : 0,
      feedback: parsed.feedback || "Answer graded",
      closestMatch: parsed.closestMatch,
    };
  },

  fallbackResult: {
    isCorrect: false,
    matchScore: 0,
    feedback: "Unable to grade answer - please try again",
    usedFallback: true,
  },
};
