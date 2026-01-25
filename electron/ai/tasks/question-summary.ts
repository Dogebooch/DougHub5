/**
 * AI Task: Question Summary Extraction
 *
 * Extracts concise summaries from QBank questions for inbox triage.
 * Generates 4-6 word clinical action phrases plus subject/type classification.
 *
 * Used in: Inbox view to differentiate captured questions
 */

import type {
  AITaskConfig,
  QuestionSummaryContext,
  QuestionSummaryResult,
} from "./types";

export const questionSummaryTask: AITaskConfig<
  QuestionSummaryContext,
  QuestionSummaryResult
> = {
  id: "question-summary",
  name: "Question Summary Extraction",
  description:
    "Extract summary, subject, and questionType from board questions",

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  temperature: 0.2, // Low for consistent classification
  maxTokens: 150, // JSON output is compact
  timeoutMs: 10000, // 10 seconds
  cacheTTLMs: 300000, // 5 minutes

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  systemPrompt: `You are a medical education AI extracting metadata from EM/IM board questions.

TASK: Extract summary, subject, and question type for flashcard optimization.

OUTPUT (JSON only):
1. "summary": 4-6 word clinical action phrase
   - Start with verb: "Managing", "Diagnosing", "Treating", "Recognizing", "When to..."
   - Examples: "Managing agitation in delirium", "Recognizing carbon monoxide toxicity"

2. "subject": Pick ONE:
   Cardiology | Pulmonology | Neurology | GI | Nephrology | Endocrinology | Rheumatology | ID | Heme/Onc | Toxicology | Trauma | Resuscitation | Derm | Psychiatry | OB/GYN | Peds | MSK | ENT | Ophthalmology | Allergy | Palliative | Preventive | Other

3. "questionType": Pick ONE (for card generation):
   - Diagnosis: Identify condition from presentation/findings
   - Management: Choose treatment, intervention, or next step
   - Workup: Select appropriate test/imaging/lab
   - Mechanism: Explain pathophysiology or drug action
   - Prognosis: Predict outcome or risk stratification
   - Prevention: Screening, prophylaxis, risk reduction
   - Pharmacology: Drug choice, dosing, interactions, side effects
   - Anatomy: Structure identification or localization
   - Complications: Recognize or prevent adverse outcomes
   - Contraindications: Identify when NOT to do something
   - Criteria: Apply diagnostic/classification criteria
   - Emergent: Time-critical intervention decision`,

  buildUserPrompt: ({ content }: QuestionSummaryContext) => `CONTENT:
${content.slice(0, 800)}

{"summary": "...", "subject": "...", "questionType": "..."}`,

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  normalizeResult: (
    parsed: QuestionSummaryResult | null
  ): QuestionSummaryResult => {
    // Validate summary has at least 3 words
    const summary = parsed?.summary || "";
    const isValidSummary = summary.split(" ").length >= 3;

    return {
      summary: isValidSummary ? summary : "Medical question",
      subject: parsed?.subject || undefined,
      questionType: parsed?.questionType || undefined,
    };
  },

  fallbackResult: {
    summary: "Medical question",
    subject: undefined,
    questionType: undefined,
    usedFallback: true,
  },
};
