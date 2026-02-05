import { AITaskConfig } from "./types";
import { z } from "zod";

export const advisorResultSchema = z.object({
  relevance: z.enum(["board_high_yield", "clinical_reference", "low_yield"]),
  summary: z
    .string()
    .describe("A concise 1-sentence summary of the core concept"),
  cardRecommendations: z
    .array(
      z.object({
        type: z.enum(["cloze", "basic", "image_occlusion", "list"]),
        rationale: z.string(),
        contentSuggestion: z
          .string()
          .describe(
            "Brief suggestion of what the card content should look like",
          ),
      }),
    )
    .describe("Suggested flashcards to create in RemNote"),
  filingPath: z
    .array(z.string())
    .describe(
      "Suggested hierarchical topics for RemNote, e.g. ['Cardiology', 'Heart Failure']",
    ),
  advice: z
    .string()
    .describe("Brief advice to the user on how to best learn this"),
});

export type AdvisorResult = z.infer<typeof advisorResultSchema>;

export const advisorTask: AITaskConfig<
  {
    content: string;
    userNotes: string;
    sourceType: string;
  },
  AdvisorResult
> = {
  id: "advisor",
  name: "DougHub Advisor",
  description:
    "Analyzes content and user notes to recommend flashcard strategy and filing",

  temperature: 0.3,
  maxTokens: 1000,
  timeoutMs: 60000,
  cacheTTLMs: 0,

  systemPrompt: `You are an expert Medical Education Advisor for a resident physician.
Your goal is to help the user curate a High-Yield Knowledge Bank in RemNote.

The user captures content (e.g. Board Questions, Articles) and adds their own "High Yield Notes".
Your job is to analyze this and advise:
1. Is this Board High Yield (Flashcard worthy), Clinical Reference (Note worthy), or Low Yield?
2. How should it be formatted as a flashcard? (Cloze, Image Occlusion, etc)
   - Image Occlusion is BEST for Radiology, EKGs, and complex Flowcharts.
   - Cloze is BEST for specific facts, numbers, or first-line treatments.
   - Basic is good for broad concepts.
3. Where should it be filed in RemNote? (Propose a logical topic hierarchy)

CRITICAL: Trust the user's notes. If they marked something as important, prioritize that.
Don't generate the actual flashcards yet—just advise on the STRATEGY.

Response Format (JSON):
{
  "relevance": "board_high_yield" | "clinical_reference" | "low_yield",
  "summary": "1-sentence summary",
  "cardRecommendations": [
    {
      "type": "cloze" | "basic" | "image_occlusion" | "list",
      "rationale": "Why this format?",
      "contentSuggestion": "Brief content idea"
    }
  ],
  "filingPath": ["Topic", "Subtopic"],
  "advice": "Brief strategy advice"
}`,

  buildUserPrompt: (context) => `
CONTENT TYPE: ${context.sourceType}

CAPTURED CONTENT:
${context.content.substring(0, 8000)} ${/* Truncate to avoid context limit */ ""}

USER'S HIGH-YIELD NOTES:
${context.userNotes || "(No specific notes added, rely on content importance)"}

Provide your advice in the specified JSON format.
`,

  normalizeResult: (parsed) => {
    try {
      // parsed is already an object from ai-service
      return advisorResultSchema.parse(parsed);
    } catch (e) {
      console.error("Failed to parse advisor response", e);
      // Fallback for malformed JSON
      return {
        relevance: "clinical_reference",
        summary: "Analysis failed, defaulting to reference.",
        cardRecommendations: [],
        filingPath: ["Unsorted"],
        advice: "Could not generate advice. Please review manually.",
      };
    }
  },
};
