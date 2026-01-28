/**
 * AI Task: Generate Quiz
 *
 * Creates blanked quiz questions from extracted facts for the Intake Quiz system.
 * Generates fill-in-the-blank style questions with the key term removed.
 *
 * Part of Notebook v2 (v24) - Intake Quiz System
 */

import type {
  AITaskConfig,
  GenerateQuizContext,
  GenerateQuizResult,
  QuizQuestion,
  ExtractedFact,
} from "./types";

export const generateQuizTask: AITaskConfig<
  GenerateQuizContext,
  GenerateQuizResult
> = {
  id: "generate-quiz",
  name: "Generate Quiz",
  description:
    "Create blanked questions from extracted facts for intake quizzing",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.3, // Slight variation in phrasing
  maxTokens: 1500, // Multiple questions
  timeoutMs: 15000, // 15 seconds
  cacheTTLMs: 300000, // 5 minutes

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education expert creating quiz questions for active recall testing.

TASK: Convert facts into fill-in-the-blank questions by removing the key term.

REQUIREMENTS:
1. Replace the key term with "_____" in a natural sentence
2. The blank should test recall of ONE specific concept
3. Include acceptable alternative answers (synonyms, abbreviations)
4. Rate difficulty: easy (common knowledge), medium (needs study), hard (nuanced)

GOOD QUESTIONS:
- "In DKA, _____ should be checked before starting insulin." (Answer: potassium)
- "The first-line treatment for status epilepticus is _____." (Answer: benzodiazepines)

BAD QUESTIONS:
- "_____ is important in DKA management." (Too vague)
- "Treatment involves _____." (No context)

OUTPUT: Valid JSON only, matching the schema exactly.`,

  buildUserPrompt: ({
    facts,
    topicContext,
    maxQuestions = 3,
  }: GenerateQuizContext) => {
    const factsJson = facts
      .slice(0, 5)
      .map((f) => ({
        fact: f.factText,
        keyTerm: f.keyTerm,
        importance: f.importance,
      }));

    return `
TOPIC: ${topicContext}

FACTS TO CONVERT:
${JSON.stringify(factsJson, null, 2)}

Generate up to ${maxQuestions} quiz questions. Prioritize "core" importance facts.

{
  "questions": [
    {
      "questionText": "Sentence with _____ for the blank",
      "correctAnswer": "The key term that was blanked",
      "acceptableAnswers": ["synonyms", "abbreviations"],
      "sourceFact": "Original fact statement",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

Make questions:
- Clear and unambiguous
- Testable with one correct answer
- Clinically relevant
    `.trim();
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (parsed: GenerateQuizResult | null): GenerateQuizResult => {
    if (!parsed?.questions || !Array.isArray(parsed.questions)) {
      return { questions: [], usedFallback: true };
    }

    const validQuestions: QuizQuestion[] = parsed.questions
      .filter(
        (q) =>
          q &&
          typeof q.questionText === "string" &&
          typeof q.correctAnswer === "string" &&
          q.questionText.includes("_____") &&
          q.correctAnswer.length > 0,
      )
      .map((q) => ({
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        acceptableAnswers: Array.isArray(q.acceptableAnswers)
          ? q.acceptableAnswers.filter((a: unknown) => typeof a === "string")
          : [],
        sourceFact: q.sourceFact || "",
        difficulty:
          q.difficulty && ["easy", "medium", "hard"].includes(q.difficulty)
            ? q.difficulty
            : "medium",
      }));

    return { questions: validQuestions };
  },

  fallbackResult: {
    questions: [],
    usedFallback: true,
  },
};
