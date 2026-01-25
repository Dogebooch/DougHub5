/**
 * AI Task Configuration Types
 *
 * Centralized type definitions for AI task configurations.
 * Each AI task (concept extraction, insight polish, card suggestion, etc.)
 * has its own config file that implements these interfaces.
 */

/**
 * Configuration for a single AI task.
 * Each task file exports one AITaskConfig object.
 */
export interface AITaskConfig<TContext = Record<string, unknown>, TResult = unknown> {
  /** Unique identifier for the task (e.g., "identify-tested-concept") */
  id: string;

  /** Human-readable name for the task */
  name: string;

  /** Description of what this task does */
  description: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Settings
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Temperature for this task (0.0 - 1.0)
   * Lower = more deterministic, higher = more creative
   */
  temperature: number;

  /** Maximum tokens in the response */
  maxTokens: number;

  /** Timeout in milliseconds for this task */
  timeoutMs: number;

  /** How long to cache results (in milliseconds) */
  cacheTTLMs: number;

  /**
   * Optional model override for this specific task.
   * If not set, uses the global model from settings.
   */
  modelOverride?: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompts
  // ─────────────────────────────────────────────────────────────────────────────

  /** System prompt that sets the AI's role and constraints */
  systemPrompt: string;

  /**
   * Builds the user prompt from the given context.
   * This is a function so it can interpolate dynamic values.
   */
  buildUserPrompt: (context: TContext) => string;

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Handling
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Optional custom response parser.
   * If not provided, uses the default JSON parser.
   *
   * @param response Raw response string from the AI
   * @returns Parsed result
   */
  parseResponse?: (response: string) => TResult;

  /**
   * Optional result normalizer/validator.
   * Called after parsing to ensure the result has required fields.
   *
   * @param parsed The parsed response
   * @returns Normalized result with defaults applied
   */
  normalizeResult?: (parsed: TResult | null) => TResult;

  /**
   * Fallback result to return if the AI call fails.
   * If not provided, errors will be thrown.
   */
  fallbackResult?: TResult;
}

/**
 * Minimal task config for the registry index.
 * Used for lookups without loading full prompt text.
 */
export interface AITaskMeta {
  id: string;
  name: string;
  description: string;
}

/**
 * Context type for identify-tested-concept task
 */
export interface IdentifyConceptContext {
  sourceContent: string;
  sourceType: string;
}

/**
 * Result type for identify-tested-concept task
 */
export interface IdentifyConceptResult {
  concept: string;
  confidence: "high" | "medium" | "low";
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/**
 * Context type for polish-insight task
 */
export interface PolishInsightContext {
  userText: string;
  sourceContent: string;
  testedConcept?: string;
}

/**
 * Result type for polish-insight task
 */
export interface PolishInsightResult {
  polished: string;
  fromUser: string[];
  addedContext: string[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/**
 * Context type for insight-evaluation task
 */
export interface InsightEvaluationContext {
  userInsight: string;
  sourceContent: string;
  isIncorrect: boolean;
  topicContext?: string;
}

/**
 * Result type for insight-evaluation task
 */
export interface InsightEvaluationResult {
  gaps: string[];
  feedbackText: string;
  confusionTags?: string[];
  examTrapType?:
    | "qualifier-misread"
    | "negation-blindness"
    | "age-population-skip"
    | "absolute-terms"
    | "best-vs-correct"
    | "timeline-confusion"
    | null;
  evaluatedAt: string;
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/**
 * Context type for card-suggestion task
 */
export interface CardSuggestionContext {
  blockContent: string;
  sourceContent: string;
  topicName: string;
}

/**
 * Result type for card-suggestion task
 */
export interface CardSuggestionResult {
  suggestedFormat: "basic" | "cloze" | "reversed";
  front: string;
  back: string;
  clozeText?: string;
  worthiness: {
    isWorthy: boolean;
    reason: string;
  };
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/**
 * Context type for capture-analysis task
 */
export interface CaptureAnalysisContext {
  content: string;
}

/**
 * Result type for capture-analysis task
 */
export interface CaptureAnalysisResult {
  title: string;
  sourceType: "qbank" | "article" | "manual" | "quickcapture";
  domain: string;
  secondaryDomains: string[];
  tags: string[];
  extractedFacts: string[];
  suggestedTopic: string;
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/**
 * Context type for elaborated-feedback task
 */
export interface ElaboratedFeedbackContext {
  cardFront: string;
  cardBack: string;
  cardType: string;
  topicContext: string;
  responseTimeMs: number | null;
}

/**
 * Result type for elaborated-feedback task
 */
export interface ElaboratedFeedbackResult {
  whyWrong: string;
  whyRight: string;
  relatedConcepts: string[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/**
 * Context type for question-summary task
 */
export interface QuestionSummaryContext {
  content: string;
  sourceType: string;
}

/**
 * Result type for question-summary task
 */
export interface QuestionSummaryResult {
  summary: string;
  subject?: string;
  questionType?: string;
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Concept Extraction Task Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context type for concept-extraction task
 */
export interface ConceptExtractionContext {
  content: string;
}

/**
 * Raw concept from AI before normalization
 */
export interface RawConceptFromAI {
  text?: string;
  concept?: string;
  conceptType?: string;
  type?: string;
  confidence: number;
  suggestedFormat?: string;
  format?: string;
}

/**
 * Result type for concept-extraction task
 */
export interface ConceptExtractionTaskResult {
  concepts: RawConceptFromAI[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Validation Task Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context type for card-validation task
 */
export interface CardValidationContext {
  front: string;
  back: string;
  cardType: "qa" | "cloze";
}

/**
 * Result type for card-validation task
 */
export interface CardValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Medical List Detection Task Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context type for medical-list-detection task
 */
export interface MedicalListDetectionContext {
  content: string;
}

/**
 * Result type for medical-list-detection task
 */
export interface MedicalListDetectionResult {
  isList: boolean;
  listType: "differential" | "procedure" | "algorithm" | null;
  items: string[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vignette Conversion Task Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context type for vignette-conversion task
 */
export interface VignetteConversionContext {
  listItem: string;
  context: string;
}

/**
 * Result type for vignette-conversion task
 */
export interface VignetteConversionResult {
  vignette: string;
  cloze: string;
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag Suggestion Task Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context type for tag-suggestion task
 */
export interface TagSuggestionContext {
  content: string;
}

/**
 * Result type for tag-suggestion task
 */
export interface TagSuggestionResult {
  tags: string[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Generation Task Types (traffic-light worthiness)
// ─────────────────────────────────────────────────────────────────────────────

/** Worthiness evaluation levels */
export type WorthinessLevel = "green" | "yellow" | "red";

/** AI evaluation of card worthiness */
export interface WorthinessResult {
  /** Has one clear correct answer (fail: essays, open-ended) */
  testable: WorthinessLevel;
  /** Tests exactly one retrievable fact (fail: lists, multiple facts) */
  oneConcept: WorthinessLevel;
  /** Distinguishes from similar concepts (fail: too generic) */
  discriminative: WorthinessLevel;
  /** Explanations for each rating */
  explanations: {
    testable: string;
    oneConcept: string;
    discriminative: string;
  };
}

/**
 * Context type for card-generation task
 */
export interface CardGenerationContext {
  blockContent: string;
  topicContext: string;
  userIntent?: string;
}

/**
 * Result type for card-generation task (single suggestion)
 */
export interface CardGenerationSuggestion {
  format: "qa" | "cloze" | "overlapping-cloze" | "image-occlusion" | "procedural";
  front: string;
  back: string;
  confidence: number;
  worthiness: WorthinessResult;
  formatReason: string;
}

/**
 * Result type for card-generation task
 */
export interface CardGenerationResult {
  suggestions: CardGenerationSuggestion[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}
