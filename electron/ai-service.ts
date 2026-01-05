/**
 * AI Service Provider Abstraction
 * 
 * Local-first AI service with Ollama auto-detection and cloud fallbacks.
 * Uses OpenAI-compatible SDK for Ollama, OpenAI, and DeepSeek.
 * 
 * Environment Variables:
 * - AI_PROVIDER: 'ollama' | 'openai' | 'deepseek' | 'anthropic'
 * - AI_BASE_URL: Override base URL for provider
 * - AI_API_KEY: API key for cloud providers
 * - AI_MODEL: Override model selection
 */

import type {
  AIProviderType,
  AIProviderConfig,
  AIProviderStatus,
  ExtractedConcept,
  ValidationResult,
  MedicalListDetection,
  VignetteConversion,
  SemanticMatch,
} from '../src/types/ai';
import type { DbNote } from './database';
import OpenAI from 'openai';

// ============================================================================
// AI Result Cache
// ============================================================================

/** Cache entry with expiration timestamp */
interface CacheEntry<T> {
  result: T;
  expires: number;
}

/** Simple content hash for cache keys */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/** AI result cache with TTL */
class AICache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 300000; // 5 minutes

  /**
   * Get cached result if not expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.result as T;
  }

  /**
   * Set cache entry with optional TTL.
   */
  set<T>(key: string, result: T, ttlMs = this.defaultTTL): void {
    this.cache.set(key, {
      result,
      expires: Date.now() + ttlMs,
    });
  }

  /**
   * Generate cache key from operation name and content.
   */
  key(operation: string, ...args: string[]): string {
    return `${operation}:${args.map(hashContent).join(':')}`;
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/** Global cache instance */
export const aiCache = new AICache();

// ============================================================================
// Provider Presets
// ============================================================================

/** Preset configurations for supported AI providers */
export const PROVIDER_PRESETS: Record<AIProviderType, AIProviderConfig> = {
  ollama: {
    type: "openai-compatible",
    baseURL: "http://localhost:11434/v1",
    apiKey: "ollama", // OpenAI SDK requires non-empty string; Ollama ignores it
    model: "qwen2.5:32b-instruct-q4_K_M", // Using available model from user's Ollama
    timeout: 30000, // 30s for local processing (larger models need more time)
    isLocal: true,
  },
  openai: {
    type: "openai-compatible",
    baseURL: "https://api.openai.com/v1",
    apiKey: "", // Must be set via env var
    model: "gpt-4o-mini",
    timeout: 3000, // 3s for cloud API
    isLocal: false,
  },
  deepseek: {
    type: "openai-compatible",
    baseURL: "https://api.deepseek.com/v1",
    apiKey: "", // Must be set via env var
    model: "deepseek-chat",
    timeout: 5000, // 5s for cloud API
    isLocal: false,
  },
  anthropic: {
    type: "anthropic",
    baseURL: "https://api.anthropic.com",
    apiKey: "", // Must be set via env var
    model: "claude-3-haiku-20240307", // Fast, cheap model for card processing
    timeout: 3000, // 3s for cloud API
    isLocal: false,
  },
};

// ============================================================================
// Provider Detection
// ============================================================================

/**
 * Auto-detect available AI provider.
 *
 * 1. Try Ollama on localhost:11434 (preferred - free, private)
 * 2. Fall back to AI_PROVIDER env var
 * 3. Default to 'ollama' if nothing configured (assume local-first)
 *
 * @returns Detected provider type
 */
export async function detectProvider(): Promise<AIProviderType> {
  // Try Ollama auto-detection using http module for better Node.js compatibility
  try {
    const { default: http } = await import("node:http");

    const isAvailable = await new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => {
        req.destroy();
        resolve(false);
      }, 1000);

      const req = http.get("http://localhost:11434/api/tags", (res) => {
        clearTimeout(timeoutId);
        resolve(res.statusCode === 200);
        res.resume(); // Consume response to free up socket
      });

      req.on("error", () => {
        clearTimeout(timeoutId);
        resolve(false);
      });
    });

    if (isAvailable) {
      console.log("[AI Service] Ollama detected on localhost:11434");
      return "ollama";
    }
  } catch (error) {
    // Ollama not available - silent fallback
    if (error instanceof Error) {
      console.log("[AI Service] Ollama detection error:", error.message);
    }
  }

  // Check environment variable
  const envProvider = process.env["AI_PROVIDER"] as AIProviderType | undefined;
  if (envProvider && envProvider in PROVIDER_PRESETS) {
    console.log(`[AI Service] Using provider from env: ${envProvider}`);
    return envProvider;
  }

  // Default to Ollama (assume local-first, will fail gracefully if not available)
  console.log("[AI Service] No provider detected, defaulting to ollama");
  return "ollama";
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get provider configuration with environment variable overrides.
 *
 * Priority: env vars > preset values
 *
 * @param provider Optional provider type (auto-detects if not provided)
 * @returns Complete provider configuration
 */
export async function getProviderConfig(
  provider?: AIProviderType
): Promise<AIProviderConfig> {
  const selectedProvider = provider ?? (await detectProvider());
  const preset = PROVIDER_PRESETS[selectedProvider];

  // Merge preset with environment overrides
  const config: AIProviderConfig = {
    ...preset,
    baseURL: process.env["AI_BASE_URL"] ?? preset.baseURL,
    apiKey: process.env["AI_API_KEY"] ?? preset.apiKey,
    model: process.env["AI_MODEL"] ?? preset.model,
  };

  return config;
}

// ============================================================================
// Client Initialization
// ============================================================================

/** Singleton client instance */
let aiClient: OpenAI | null = null;

/** Cached provider config for the current client */
let currentConfig: AIProviderConfig | null = null;

/**
 * Initialize OpenAI-compatible client with provider configuration.
 * Supports Ollama, OpenAI, and DeepSeek via configurable baseURL.
 *
 * @param config Optional provider configuration (auto-detects if not provided)
 * @returns OpenAI client instance
 */
export async function initializeClient(
  config?: AIProviderConfig
): Promise<OpenAI> {
  const providerConfig = config ?? (await getProviderConfig());

  aiClient = new OpenAI({
    baseURL: providerConfig.baseURL,
    apiKey: providerConfig.apiKey || "ollama", // Ollama ignores this, SDK requires non-empty
    timeout: providerConfig.timeout,
    maxRetries: 0, // We handle retries ourselves for better control
  });

  currentConfig = providerConfig;

  console.log(
    `[AI Service] Initialized ${
      providerConfig.isLocal ? "local" : "cloud"
    } client:`,
    {
      baseURL: providerConfig.baseURL,
      model: providerConfig.model,
      timeout: providerConfig.timeout,
    }
  );

  return aiClient;
}

/**
 * Get the AI client singleton, initializing if needed.
 *
 * @returns OpenAI client instance
 */
export async function getClient(): Promise<OpenAI> {
  if (!aiClient) {
    return await initializeClient();
  }
  return aiClient;
}

/**
 * Get the current provider configuration.
 *
 * @returns Current config or null if not initialized
 */
export function getCurrentConfig(): AIProviderConfig | null {
  return currentConfig;
}

// ============================================================================
// Provider Status
// ============================================================================

/**
 * Get current provider status and connection state.
 *
 * @returns Provider status information
 */
export async function getProviderStatus(): Promise<AIProviderStatus> {
  const detectedProvider = await detectProvider();
  const config = await getProviderConfig(detectedProvider);

  // Check connection by attempting a quick request
  let isConnected = false;

  if (config.isLocal) {
    // For local providers, check if API is reachable using http module
    try {
      const { default: http } = await import("node:http");

      isConnected = await new Promise<boolean>((resolve) => {
        const timeoutId = setTimeout(() => {
          req.destroy();
          resolve(false);
        }, 500);

        const req = http.get(
          `${config.baseURL.replace("/v1", "")}/api/tags`,
          (res) => {
            clearTimeout(timeoutId);
            resolve(res.statusCode === 200);
            res.resume();
          }
        );

        req.on("error", () => {
          clearTimeout(timeoutId);
          resolve(false);
        });
      });
    } catch {
      isConnected = false;
    }
  } else {
    // For cloud providers, assume connected if API key is present
    isConnected = config.apiKey.length > 0;
  }

  return {
    provider: detectedProvider,
    model: config.model,
    isLocal: config.isLocal,
    isConnected,
  };
}

// ============================================================================
// System Prompts
// ============================================================================

/** System prompts for AI operations */
const PROMPTS = {
  conceptExtraction: `You are a medical education AI assistant specializing in flashcard creation.
Your task is to extract key learning concepts from pasted medical content.

For each concept, identify:
1. The core fact, definition, mechanism, or relationship
2. The type of concept (definition, mechanism, differential, treatment, diagnostic, epidemiology)
3. Whether it's best as a Q&A card or cloze deletion
4. Your confidence level (0-1) based on clarity and importance

Guidelines:
- Focus on testable, discrete facts
- Prefer cloze for lists, sequences, and fill-in-the-blank content
- Prefer Q&A for "why" questions, mechanisms, and comparisons
- Extract 3-7 concepts per input, prioritizing high-yield content
- Skip trivial or obvious information

Respond with valid JSON only, no markdown formatting.`,

  cardValidation: `You are a medical education AI assistant that validates flashcard quality.
Evaluate cards based on the Minimum Information Principle:
1. Each card should test ONE atomic piece of knowledge
2. The question should be clear and unambiguous
3. The answer should be concise and directly address the question
4. Avoid compound questions or multiple answers

Check for common issues:
- Question too broad or vague
- Answer too long (>50 words suggests multiple concepts)
- Missing context needed for understanding
- Cloze deletions that are too easy or ambiguous

Respond with valid JSON only, no markdown formatting.`,

  medicalListDetection: `You are a medical education AI assistant that identifies structured medical lists.
Analyze the content to determine if it's a medical list that would benefit from vignette conversion.

Types of medical lists:
1. Differential diagnosis lists (DDx) - conditions that could cause a symptom/finding
2. Procedure lists - steps in a medical procedure or algorithm
3. Algorithm lists - decision trees or treatment pathways

Indicators of a medical list:
- Numbered or bulleted items
- Common list headers: "Causes of...", "DDx for...", "Steps to...", "Treatment of..."
- Multiple related medical terms in a structured format
- Mnemonic-based content

Extract each item as a standalone entry suitable for flashcard conversion.

Respond with valid JSON only, no markdown formatting.`,

  vignetteConversion: `You are a medical education AI assistant that converts medical list items into clinical vignettes.
Your task is to transform a list item into a realistic patient scenario that tests the same knowledge.

Guidelines for vignette creation:
1. Include realistic patient demographics (age, sex when relevant)
2. Present clinical findings that logically point to the answer
3. Use "A X-year-old patient presents with..." format
4. Include key history, physical exam, or lab findings
5. Make each vignette independently answerable without needing sibling context
6. Avoid giving away the answer in the presentation
7. Keep vignettes concise (2-4 sentences)

For the cloze version:
- Create a fill-in-the-blank statement using {{c1::answer}} format
- The cloze should test the same concept as the vignette

Respond with valid JSON only, no markdown formatting.`,

  tagSuggestion: `You are a medical education AI assistant that suggests relevant tags for medical content.
Analyze the content and suggest 2-5 tags from these categories:

Medical Specialties:
cardiology, pulmonology, gastroenterology, nephrology, neurology, endocrinology,
rheumatology, hematology, oncology, infectious-disease, dermatology, psychiatry,
emergency-medicine, critical-care, pediatrics, obstetrics, surgery

Foundational Sciences:
anatomy, physiology, pathology, pharmacology, biochemistry, microbiology, immunology

Content Types:
diagnosis, treatment, mechanism, epidemiology, pathophysiology, clinical-presentation,
differential-diagnosis, procedure, algorithm, lab-interpretation

Only suggest tags that are directly relevant to the content.
Prefer specific tags over general ones (e.g., "cardiology" over "medicine").

Respond with valid JSON only, no markdown formatting.`,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wrap a promise with a timeout.
 *
 * @param promise Promise to wrap
 * @param ms Timeout in milliseconds
 * @param errorMessage Error message for timeout
 * @returns Promise result or throws on timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Retry a function with exponential backoff.
 *
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelayMs Base delay between retries
 * @returns Function result or throws after all retries
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 500
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on timeout or if it's the last attempt
      if (lastError.message.includes('timed out') || attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log(`[AI Service] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
    }
  }

  throw lastError;
}

/**
 * Make a chat completion request to the AI provider.
 *
 * @param systemPrompt System prompt for the AI
 * @param userMessage User message/content to process
 * @returns AI response text
 */
async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const client = await getClient();
  const config = getCurrentConfig();

  if (!config) {
    throw new Error('AI client not initialized');
  }

  const response = await withTimeout(
    client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 2000,
    }),
    config.timeout,
    `AI request timed out after ${config.timeout}ms`
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from AI provider');
  }

  return content;
}

/**
 * Parse JSON from AI response, handling markdown code blocks.
 *
 * @param text AI response text
 * @returns Parsed JSON object
 */
function parseAIResponse<T>(text: string): T {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}

// ============================================================================
// Concept Extraction
// ============================================================================

/** Response format for concept extraction */
interface ConceptExtractionResponse {
  concepts: Array<{
    text: string;
    conceptType: string;
    confidence: number;
    suggestedFormat: 'qa' | 'cloze';
  }>;
}

/**
 * Extract learning concepts from pasted medical content.
 *
 * @param content Raw text content to analyze
 * @returns Array of extracted concepts with metadata
 */
export async function extractConcepts(content: string): Promise<ExtractedConcept[]> {
  if (!content.trim()) {
    return [];
  }

  try {
    const response = await withRetry(async () => {
      return await callAI(
        PROMPTS.conceptExtraction,
        `Extract learning concepts from this medical content:\n\n${content}`
      );
    });

    const parsed = parseAIResponse<ConceptExtractionResponse>(response);

    // Add unique IDs and validate response
    return parsed.concepts.map((concept, index) => ({
      id: `concept-${Date.now()}-${index}`,
      text: concept.text,
      conceptType: concept.conceptType,
      confidence: Math.min(1, Math.max(0, concept.confidence)), // Clamp to 0-1
      suggestedFormat: concept.suggestedFormat === 'cloze' ? 'cloze' : 'qa',
    }));
  } catch (error) {
    console.error('[AI Service] Concept extraction failed:', error);
    throw error;
  }
}

// ============================================================================
// Card Validation
// ============================================================================

/** Response format for card validation */
interface CardValidationResponse {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
}

/**
 * Validate a flashcard for quality and adherence to learning principles.
 *
 * @param front Card front (question or cloze text)
 * @param back Card back (answer)
 * @param cardType Type of card ('qa' or 'cloze')
 * @returns Validation result with warnings and suggestions
 */
export async function validateCard(
  front: string,
  back: string,
  cardType: 'qa' | 'cloze' = 'qa'
): Promise<ValidationResult> {
  if (!front.trim()) {
    return {
      isValid: false,
      warnings: ['Card front is empty'],
      suggestions: ['Add a question or cloze deletion text'],
    };
  }

  if (!back.trim() && cardType === 'qa') {
    return {
      isValid: false,
      warnings: ['Card back is empty'],
      suggestions: ['Add an answer to the question'],
    };
  }

  try {
    const cardContent = cardType === 'cloze'
      ? `Cloze card:\n${front}`
      : `Question: ${front}\nAnswer: ${back}`;

    const response = await withRetry(async () => {
      return await callAI(
        PROMPTS.cardValidation,
        `Validate this ${cardType} flashcard:\n\n${cardContent}`
      );
    });

    const parsed = parseAIResponse<CardValidationResponse>(response);

    return {
      isValid: parsed.isValid ?? true,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (error) {
    console.error('[AI Service] Card validation failed:', error);
    // Return a permissive result on error - don't block card creation
    return {
      isValid: true,
      warnings: ['AI validation unavailable'],
      suggestions: [],
    };
  }
}

// ============================================================================
// Medical List Detection
// ============================================================================

/** Response format for medical list detection */
interface MedicalListDetectionResponse {
  isList: boolean;
  listType: 'differential' | 'procedure' | 'algorithm' | null;
  items: string[];
}

/**
 * Detect if content is a medical list that should be converted to vignettes.
 *
 * @param content Content to analyze
 * @returns Detection result with list type and extracted items
 */
export async function detectMedicalList(content: string): Promise<MedicalListDetection> {
  if (!content.trim()) {
    return { isList: false, listType: null, items: [] };
  }

  // Quick heuristic check before calling AI
  const hasListIndicators =
    content.includes('\n-') ||
    content.includes('\n•') ||
    content.includes('\n1.') ||
    content.includes('\n1)') ||
    /\b(ddx|differential|causes of|steps|algorithm)\b/i.test(content);

  if (!hasListIndicators) {
    return { isList: false, listType: null, items: [] };
  }

  try {
    const response = await withRetry(async () => {
      return await callAI(
        PROMPTS.medicalListDetection,
        `Analyze this content to determine if it's a medical list:\n\n${content}`
      );
    });

    const parsed = parseAIResponse<MedicalListDetectionResponse>(response);

    return {
      isList: parsed.isList ?? false,
      listType: parsed.listType ?? null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch (error) {
    console.error('[AI Service] Medical list detection failed:', error);
    // Return non-list on error to allow normal processing
    return { isList: false, listType: null, items: [] };
  }
}

// ============================================================================
// Vignette Conversion
// ============================================================================

/** Response format for vignette conversion */
interface VignetteConversionResponse {
  vignette: string;
  cloze: string;
}

/**
 * Convert a medical list item to a clinical vignette and cloze deletion.
 *
 * @param listItem The list item to convert (e.g., "Acute MI")
 * @param context Additional context about the list (e.g., "DDx for chest pain")
 * @returns Vignette and cloze versions of the content
 */
export async function convertToVignette(
  listItem: string,
  context: string
): Promise<VignetteConversion> {
  if (!listItem.trim()) {
    throw new Error('List item is required for vignette conversion');
  }

  try {
    const prompt = context
      ? `Convert this medical list item to a clinical vignette.\n\nContext: ${context}\nItem: ${listItem}`
      : `Convert this medical list item to a clinical vignette.\n\nItem: ${listItem}`;

    const response = await withRetry(async () => {
      return await callAI(PROMPTS.vignetteConversion, prompt);
    });

    const parsed = parseAIResponse<VignetteConversionResponse>(response);

    if (!parsed.vignette || !parsed.cloze) {
      throw new Error('Invalid vignette conversion response');
    }

    return {
      vignette: parsed.vignette,
      cloze: parsed.cloze,
    };
  } catch (error) {
    console.error('[AI Service] Vignette conversion failed:', error);
    throw error;
  }
}

// ============================================================================
// Tag Suggestions
// ============================================================================

/** Response format for tag suggestions */
interface TagSuggestionResponse {
  tags: string[];
}

/**
 * Suggest relevant medical domain tags for content.
 *
 * @param content Content to analyze for tags
 * @returns Array of suggested tag strings
 */
export async function suggestTags(content: string): Promise<string[]> {
  if (!content.trim()) {
    return [];
  }

  try {
    const response = await withRetry(async () => {
      return await callAI(
        PROMPTS.tagSuggestion,
        `Suggest relevant medical tags for this content:\n\n${content}`
      );
    });

    const parsed = parseAIResponse<TagSuggestionResponse>(response);

    // Normalize tags: lowercase, trim, filter empty
    const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
    return tags
      .map(tag => tag.toLowerCase().trim())
      .filter(tag => tag.length > 0)
      .slice(0, 5); // Limit to 5 tags
  } catch (error) {
    console.error('[AI Service] Tag suggestion failed:', error);
    // Return empty array on error - tags are optional
    return [];
  }
}

// ============================================================================
// Semantic Similarity (Keyword-based for MVP)
// ============================================================================

/**
 * Calculate simple term frequency for a text.
 * Normalizes text and counts word occurrences.
 */
function getTermFrequency(text: string): Map<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2); // Skip very short words

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

/**
 * Calculate cosine similarity between two term frequency maps.
 */
function cosineSimilarity(
  tf1: Map<string, number>,
  tf2: Map<string, number>
): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  // Calculate dot product and norm1
  tf1.forEach((count, word) => {
    norm1 += count * count;
    if (tf2.has(word)) {
      dotProduct += count * tf2.get(word)!;
    }
  });

  // Calculate norm2
  tf2.forEach((count) => {
    norm2 += count * count;
  });

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Find notes semantically related to the given content.
 * Uses TF-IDF-style keyword matching for MVP (vector embeddings post-MVP).
 *
 * @param content Content to find related notes for
 * @param existingNotes Array of existing notes to search
 * @param minSimilarity Minimum similarity threshold (default 0.1)
 * @param maxResults Maximum number of results (default 5)
 * @returns Array of semantic matches sorted by similarity
 */
export function findRelatedNotes(
  content: string,
  existingNotes: DbNote[],
  minSimilarity = 0.1,
  maxResults = 5
): SemanticMatch[] {
  if (!content.trim() || existingNotes.length === 0) {
    return [];
  }

  const contentTF = getTermFrequency(content);

  const matches: SemanticMatch[] = [];

  for (const note of existingNotes) {
    // Combine title and content for comparison
    const noteText = `${note.title} ${note.content}`;
    const noteTF = getTermFrequency(noteText);

    const similarity = cosineSimilarity(contentTF, noteTF);

    if (similarity >= minSimilarity) {
      matches.push({
        noteId: note.id,
        similarity: Math.round(similarity * 1000) / 1000, // Round to 3 decimal places
      });
    }
  }

  // Sort by similarity descending and limit results
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}

// ============================================================================
// Exports
// ============================================================================

export {
  type AIProviderType,
  type AIProviderConfig,
  type AIProviderStatus,
  type ExtractedConcept,
  type ValidationResult,
  type MedicalListDetection,
  type VignetteConversion,
  type SemanticMatch,
} from '../src/types/ai';
