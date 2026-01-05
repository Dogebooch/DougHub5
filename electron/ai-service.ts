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
} from '../src/types/ai';
import OpenAI from 'openai';

// ============================================================================
// Provider Presets
// ============================================================================

/** Preset configurations for supported AI providers */
export const PROVIDER_PRESETS: Record<AIProviderType, AIProviderConfig> = {
  ollama: {
    type: 'openai-compatible',
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama', // OpenAI SDK requires non-empty string; Ollama ignores it
    model: 'llama3.2',
    timeout: 10000, // 10s for local processing
    isLocal: true,
  },
  openai: {
    type: 'openai-compatible',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '', // Must be set via env var
    model: 'gpt-4o-mini',
    timeout: 3000, // 3s for cloud API
    isLocal: false,
  },
  deepseek: {
    type: 'openai-compatible',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: '', // Must be set via env var
    model: 'deepseek-chat',
    timeout: 5000, // 5s for cloud API
    isLocal: false,
  },
  anthropic: {
    type: 'anthropic',
    baseURL: 'https://api.anthropic.com',
    apiKey: '', // Must be set via env var
    model: 'claude-3-haiku-20240307', // Fast, cheap model for card processing
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
 * 3. Default to 'openai' if nothing configured
 * 
 * @returns Detected provider type
 */
export async function detectProvider(): Promise<AIProviderType> {
  // Try Ollama auto-detection
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);
    
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('[AI Service] Ollama detected on localhost:11434');
      return 'ollama';
    }
  } catch (error) {
    // Ollama not available - silent fallback
    if (error instanceof Error && error.name !== 'AbortError') {
      console.log('[AI Service] Ollama not available:', error.message);
    }
  }
  
  // Check environment variable
  const envProvider = process.env['AI_PROVIDER'] as AIProviderType | undefined;
  if (envProvider && envProvider in PROVIDER_PRESETS) {
    console.log(`[AI Service] Using provider from env: ${envProvider}`);
    return envProvider;
  }
  
  // Default fallback
  console.log('[AI Service] No provider detected, defaulting to openai');
  return 'openai';
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
export async function getProviderConfig(provider?: AIProviderType): Promise<AIProviderConfig> {
  const selectedProvider = provider ?? await detectProvider();
  const preset = PROVIDER_PRESETS[selectedProvider];
  
  // Merge preset with environment overrides
  const config: AIProviderConfig = {
    ...preset,
    baseURL: process.env['AI_BASE_URL'] ?? preset.baseURL,
    apiKey: process.env['AI_API_KEY'] ?? preset.apiKey,
    model: process.env['AI_MODEL'] ?? preset.model,
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
export async function initializeClient(config?: AIProviderConfig): Promise<OpenAI> {
  const providerConfig = config ?? await getProviderConfig();

  aiClient = new OpenAI({
    baseURL: providerConfig.baseURL,
    apiKey: providerConfig.apiKey || 'ollama', // Ollama ignores this, SDK requires non-empty
    timeout: providerConfig.timeout,
    maxRetries: 0, // We handle retries ourselves for better control
  });

  currentConfig = providerConfig;

  console.log(`[AI Service] Initialized ${providerConfig.isLocal ? 'local' : 'cloud'} client:`, {
    baseURL: providerConfig.baseURL,
    model: providerConfig.model,
    timeout: providerConfig.timeout,
  });

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
    // For local providers, check if API is reachable
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);
      
      const response = await fetch(`${config.baseURL.replace('/v1', '')}/api/tags`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      isConnected = response.ok;
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
// Exports
// ============================================================================

export {
  type AIProviderType,
  type AIProviderConfig,
  type AIProviderStatus,
  type ExtractedConcept,
  type ValidationResult,
} from '../src/types/ai';
