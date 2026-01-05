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
