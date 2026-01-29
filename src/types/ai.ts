/**
 * AI Provider Type Definitions
 * 
 * Defines types for AI-powered features: concept extraction, card validation,
 * medical list detection, and semantic search.
 */

// ============================================================================
// Provider Configuration
// ============================================================================

/** Supported AI providers */
export type AIProviderType = 'ollama' | 'openai' | 'deepseek' | 'anthropic';

/** Provider configuration for API clients */
export interface AIProviderConfig {
  /** Provider API type */
  type: 'openai-compatible' | 'anthropic';
  /** Base URL for API endpoint */
  baseURL: string;
  /** API key for authentication (empty for local providers) */
  apiKey: string;
  /** Model identifier */
  model: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Whether provider runs locally (no API costs) */
  isLocal: boolean;
}

/** Provider connection status */
export interface AIProviderStatus {
  /** Currently configured provider */
  provider: AIProviderType;
  /** Model being used */
  model: string;
  /** Whether provider is local */
  isLocal: boolean;
  /** Whether provider is currently connected */
  isConnected: boolean;
  /** Available models (populated for local providers) */
  availableModels?: string[];
  /** Current runtime settings */
  settings?: {
    temperature: number;
    maxTokens: number;
    baseURL: string;
    timeout: number;
  };
  /** Path to the status JSON file for external shell access */
  statusFilePath?: string;
}

// ============================================================================
// Concept Extraction
// ============================================================================

/** AI-extracted concept from pasted content */
export interface ExtractedConcept {
  /** Unique identifier */
  id: string;
  /** The extracted text/concept */
  text: string;
  /** Type of concept (e.g., 'definition', 'mechanism', 'differential') */
  conceptType: string;
  /** AI confidence score (0-1) */
  confidence: number;
  /** AI-suggested card format */
  suggestedFormat: 'qa' | 'cloze';
}

/** Result from concept extraction including list detection */
export interface ConceptExtractionResult {
  /** Extracted concepts */
  concepts: ExtractedConcept[];
  /** Medical list detection result */
  listDetection: MedicalListDetection;
}

// ============================================================================
// Card Validation
// ============================================================================

/** AI validation result for card quality */
export interface ValidationResult {
  /** Whether card passes minimum information principle */
  isValid: boolean;
  /** Array of warning messages */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

// ============================================================================
// Medical List Processing
// ============================================================================

/** Detection result for medical lists */
export interface MedicalListDetection {
  /** Whether content is a medical list */
  isList: boolean;
  /** Type of medical list */
  listType: 'differential' | 'procedure' | 'algorithm' | null;
  /** Extracted list items */
  items: string[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/** Converted vignette from medical list */
export interface VignetteConversion {
  /** Clinical vignette scenario */
  vignette: string;
  /** Cloze deletion version */
  cloze: string;
}

// ============================================================================
// Semantic Search
// ============================================================================

/** Semantic match result for note suggestions */
export interface SemanticMatch {
  /** ID of matching note */
  noteId: string;
  /** Similarity score (0-1) */
  similarity: number;
}

// ============================================================================
// Card Generation (T42.1)
// ============================================================================

/** Supported card formats for generation */
export type CardFormat = 'qa' | 'cloze' | 'overlapping-cloze' | 'image-occlusion' | 'procedural';

/** Worthiness evaluation levels */
export type WorthinessLevel = 'green' | 'yellow' | 'red';

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

/** A card suggestion generated by AI */
export interface CardSuggestion {
  /** Suggested format */
  format: CardFormat;
  /** Front content (question or text with cloze) */
  front: string;
  /** Back content (answer or empty for cloze) */
  back: string;
  /** AI confidence score (0-1) */
  confidence: number;
  /** Quality evaluation */
  worthiness: WorthinessResult;
  /** Why this format was chosen */
  formatReason: string;
}

/** Result of AI-elaborated feedback for a struggling student */
export interface ElaboratedFeedback {
  /** Why the user might have been confused or common clinical pitfalls */
  whyWrong: string;
  /** High-yield explanation of why the correct answer is right */
  whyRight: string;
  /** Related clinical concepts to distinguish from this one */
  relatedConcepts: string[];
}

// ============================================================================
// Quick Capture Analysis
// ============================================================================

/** AI analysis result for quick capture content */
export interface CaptureAnalysisResult {
  /** Short title (<10 words) */
  title: string;
  /** Detected source type */
  sourceType: 'qbank' | 'article' | 'pdf' | 'image' | 'quickcapture' | 'manual';
  /** Primary medical domain/specialty */
  domain: string;
  /** Secondary domains for cross-topic relevance */
  secondaryDomains: string[];
  /** Suggested tags for organization */
  tags: string[];
  /** Key facts extracted from content */
  extractedFacts: string[];
  /** Suggested canonical topic name */
  suggestedTopic: string;
}

// ============================================================================
// Notebook v2: Quiz System Types (v24)
// ============================================================================

/** A single testable fact extracted from source content */
export interface ExtractedFact {
  /** The core fact statement (blanking target) */
  factText: string;
  /** Key term/concept that would be blanked in quiz */
  keyTerm: string;
  /** Context sentence around the fact */
  context: string;
  /** How central is this to the content */
  importance: 'core' | 'supporting' | 'peripheral';
}

/** Result from extractFacts AI call */
export interface ExtractFactsResult {
  facts: ExtractedFact[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/** A quiz question generated from a fact */
export interface QuizQuestion {
  /** Question text with blank (e.g., "In DKA, _____ should be checked before insulin") */
  questionText: string;
  /** The correct answer (key term that was blanked) */
  correctAnswer: string;
  /** Alternative acceptable answers */
  acceptableAnswers: string[];
  /** The original fact this came from */
  sourceFact: string;
  /** Difficulty based on specificity */
  difficulty: 'easy' | 'medium' | 'hard';
}

/** Result from generateQuiz AI call */
export interface GenerateQuizResult {
  questions: QuizQuestion[];
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/** Result from gradeAnswer AI call */
export interface GradeAnswerResult {
  isCorrect: boolean;
  /** Semantic match score 0-1 */
  matchScore: number;
  /** Explanation of why answer was right/wrong */
  feedback: string;
  /** The closest correct answer if wrong */
  closestMatch?: string;
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

/** Result from detectConfusion AI call */
export interface DetectConfusionResult {
  /** Whether confusion was detected */
  hasConfusion: boolean;
  /** The concept the user confused with */
  confusedWith?: string;
  /** Explanation of the confusion */
  confusionReason?: string;
  /** Suggested disambiguation concept pair */
  conceptPair?: {
    conceptA: string;
    conceptB: string;
  };
  /** True if AI failed and fallback was used */
  usedFallback?: boolean;
}

// ============================================================================
// Flashcard Analysis (Integrated Dashboard)
// ============================================================================

/**
 * Context for the "Integrated Analysis" prompt
 */
export interface FlashcardAnalysisContext {
  stem: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  top3VectorMatches: string; // JSON string
  userRole?: string;
}

/**
 * Result of the integrated analysis
 */
export interface FlashcardAnalysisResult {
  gapAnalysis: {
    type: "PURE_RECALL" | "PARTIAL_RECALL" | "INTERFERENCE" | "INTEGRATION_FAILURE" | "MISREAD" | null;
    confidence: number;
    reasoning: string;
  };
  worthiness: {
    score: number;
    rationale: string;
  };
  interference: {
    isDuplicate: boolean;
    similarityNote: string;
  };
  draftCard: {
    front: string;
    back: string;
  };
  usedFallback?: boolean;
}
