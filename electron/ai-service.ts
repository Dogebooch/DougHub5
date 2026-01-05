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
// Exports
// ============================================================================

export { type AIProviderType, type AIProviderConfig, type AIProviderStatus } from '../src/types/ai';
