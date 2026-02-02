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
  ConceptExtractionResult,
  ValidationResult,
  MedicalListDetection,
  VignetteConversion,
  SemanticMatch,
  CardSuggestion,
  ElaboratedFeedback,
  ElaboratedFeedback,
  CaptureAnalysisResult,
  ArticleSynthesisContext, // Phase 4
  ArticleSynthesisResult, // Phase 4
} from "../src/types/ai";
import { type DbNote, type NotebookBlockAiEvaluation } from "./database/types";
import { settingsQueries } from "./database/settings";
import { noteQueries } from "./database/notes";
import { devSettingsQueries } from "./database/dev-settings";
import * as crypto from "node:crypto";
import OpenAI from "openai";
import * as http from "node:http";
import { spawn } from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";
import { app } from "electron";
import { notifyOllamaStatus, notifyAILog } from "./ipc-utils";
import { augmentAndSyncDevStatus } from "./ai/dev-status-sync";

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
    hash = (hash << 5) - hash + char;
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
    return `${operation}:${args.map(hashContent).join(":")}`;
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
// AI Task Configuration Framework
// ============================================================================
//
// Task configurations have been migrated to individual files in:
//   electron/ai/tasks/
//
// Each task file exports a typed AITaskConfig with:
// - System prompt
// - User prompt builder
// - Temperature, max tokens, timeout settings
// - Result normalizer and fallback
//
// See electron/ai/tasks/index.ts for the task registry.
// ============================================================================

// ============================================================================
// Provider Presets
// ============================================================================

/** Preset configurations for supported AI providers */
export const PROVIDER_PRESETS: Record<AIProviderType, AIProviderConfig> = {
  ollama: {
    type: "openai-compatible",
    baseURL: "http://localhost:11434/v1",
    apiKey: "ollama", // OpenAI SDK requires non-empty string; Ollama ignores it
    model: "qwen2.5:7b-instruct", // Tested winner: fast, clean JSON, accurate medical extraction
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

/** Flag to prevent multiple concurrent Ollama startup attempts */
let isStartingOllama = false;

/**
 * Reset Ollama startup state (primarily for testing).
 */
export function resetOllamaState(): void {
  isStartingOllama = false;
}

/**
 * Check if Ollama is currently running and responding.
 *
 * @returns True if Ollama is reachable
 */
export async function isOllamaRunning(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req = http.get("http://localhost:11434/v1/models", (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    // 1s timeout for quick check
    req.setTimeout(1000);
  });
}

/**
 * Locate the Ollama executable on the system.
 *
 * @returns Path to executable or 'ollama' if should rely on PATH
 */
export function findOllamaExecutable(): string {
  if (os.platform() === "win32") {
    // Check common Windows location
    const localAppData = process.env["LOCALAPPDATA"] || "";
    const winPath = path.join(localAppData, "Programs", "Ollama", "ollama.exe");
    if (fs.existsSync(winPath)) {
      return winPath;
    }
  } else {
    // Check common macOS/Linux location
    const unixPath = "/usr/local/bin/ollama";
    if (fs.existsSync(unixPath)) {
      return unixPath;
    }
  }

  // Fallback to PATH
  return "ollama";
}

/**
 * Ensures Ollama is running, starting it if necessary.
 *
 * @returns True if Ollama is running or was successfully started
 */
export async function ensureOllamaRunning(): Promise<boolean> {
  if (isStartingOllama) {
    // Already in the middle of a startup attempt
    return false;
  }

  // 1. Check if already running
  if (await isOllamaRunning()) {
    console.log("[AI Service] Ollama already running");
    notifyOllamaStatus(
      "already-running",
      "Local AI service is already running.",
    );
    return true;
  }

  isStartingOllama = true;
  console.log("[AI Service] Starting Ollama...");
  notifyOllamaStatus("starting", "Starting local AI service (Ollama)...");

  try {
    const exe = findOllamaExecutable();

    // 2. Spawn as detached background process (headless on Windows)
    const ollamaProcess = spawn(exe, ["serve"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true, // Prevent console window on Windows
    });

    // Track for cleanup on exit
    const { processManager } = await import("./process-manager");
    processManager.track(ollamaProcess);

    ollamaProcess.unref();

    // 3. Retry connection check (10 times with 500ms delay)
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (await isOllamaRunning()) {
        console.log("[AI Service] Ollama started successfully");
        notifyOllamaStatus("started", "Local AI service is ready.");
        // Automatic status sync on success
        getProviderStatus().catch(() => {});
        isStartingOllama = false;
        return true;
      }
    }

    // If loop finished without success
    notifyOllamaStatus(
      "failed",
      "Local AI service failed to respond after starting.",
    );
    getProviderStatus().catch(() => {});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AI Service] Failed to start Ollama:", err);
    notifyOllamaStatus(
      "failed",
      `Could not start local AI service: ${message}`,
    );
    getProviderStatus().catch(() => {});
  }

  console.error("[AI Service] Failed to start Ollama after retries");
  isStartingOllama = false;
  return false;
}

/**
 * Get list of available Ollama models from the local system.
 * Ensures Ollama is running first.
 *
 * @returns Array of model names or empty array if Ollama is not available
 */
export async function getAvailableOllamaModels(): Promise<string[]> {
  try {
    // Ensure Ollama is running
    const isRunning = await ensureOllamaRunning();
    if (!isRunning) {
      console.log("[AI Service] Ollama not available for model detection");
      return [];
    }

    // Fetch models from Ollama API
    return new Promise<string[]>((resolve) => {
      const req = http.get("http://localhost:11434/api/tags", (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsed: { models?: Array<{ name: string }> } =
              JSON.parse(data);
            const models = parsed.models || [];
            const modelNames = models.map((m) => m.name);
            console.log(
              `[AI Service] Found ${modelNames.length} Ollama models:`,
              modelNames,
            );
            resolve(modelNames);
          } catch (error) {
            console.error(
              "[AI Service] Failed to parse Ollama models response:",
              error,
            );
            resolve([]);
          }
        });
      });

      req.on("error", (error) => {
        console.error("[AI Service] Failed to fetch Ollama models:", error);
        resolve([]);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve([]);
      });
    });
  } catch (error) {
    console.error("[AI Service] Error in getAvailableOllamaModels:", error);
    return [];
  }
}

// ============================================================================
// Provider Detection
// ============================================================================

/**
 * Auto-detect available AI provider.
 *
 * 1. Try Ollama on localhost:11434 (preferred - free, private)
 * 2. Fall back to AI_PROVIDER env var
 * 3. Default to 'ollama' if nothing configured (assume local-first)
 * @returns Detected provider type
 */
export async function detectProvider(): Promise<AIProviderType> {
  // Check user settings first
  const settingsProvider = settingsQueries.get(
    "aiProvider",
  ) as AIProviderType | null;
  if (settingsProvider) {
    return settingsProvider;
  }

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
  provider?: AIProviderType,
): Promise<AIProviderConfig> {
  const selectedProvider = provider ?? (await detectProvider());
  const preset = PROVIDER_PRESETS[selectedProvider];

  // Helper to check settings vs env
  const getSetting = (key: string) => settingsQueries.get(key);

  const apiKey =
    (selectedProvider === "openai"
      ? getSetting("openaiApiKey")
      : selectedProvider === "anthropic"
        ? getSetting("anthropicApiKey")
        : null) ??
    process.env["AI_API_KEY"] ??
    preset.apiKey;

  const model =
    (selectedProvider === "openai"
      ? getSetting("openaiModel")
      : selectedProvider === "anthropic"
        ? getSetting("anthropicModel")
        : selectedProvider === "ollama"
          ? getSetting("ollamaModel")
          : null) ??
    process.env["AI_MODEL"] ??
    preset.model;

  // Merge preset with environment overrides and user settings
  const config: AIProviderConfig = {
    ...preset,
    baseURL: process.env["AI_BASE_URL"] ?? preset.baseURL,
    apiKey: apiKey,
    model: model,
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
  config?: AIProviderConfig,
): Promise<OpenAI> {
  const providerConfig = config ?? (await getProviderConfig());

  // Ensure Ollama is running if using local provider
  if (providerConfig.isLocal) {
    await ensureOllamaRunning();
  }

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
    },
  );

  return aiClient;
}

/**
 * Reset the AI client singleton.
 * Forces re-initialization on the next use with current settings.
 */
export function resetAIClient(): void {
  aiClient = null;
  currentConfig = null;
  console.log("[AI Service] Client reset (settings changed or manual reset)");
}

/**
 * Get the AI client singleton, initializing if needed.
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
          },
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

  // Fetch available models if local
  let availableModels: string[] | undefined;
  if (config.isLocal && isConnected) {
    availableModels = await getAvailableOllamaModels();
  }

  const status: AIProviderStatus = {
    provider: detectedProvider,
    model: config.model,
    isLocal: config.isLocal,
    isConnected,
  };

  // Augment with dev-only fields and sync to file (automatic in dev mode)
  return await augmentAndSyncDevStatus(status, config, availableModels);
}

// ============================================================================
// AI Task Configuration
// ============================================================================
//
// All AI task configurations (prompts, settings, response handling) have been
// migrated to individual files in electron/ai/tasks/*.ts
//
// See electron/ai/tasks/index.ts for the task registry.
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
  errorMessage = "Operation timed out",
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
  baseDelayMs = 500,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on timeout or if it's the last attempt
      if (lastError.message.includes("timed out") || attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.log(
        `[AI Service] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`,
      );
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
async function callAI(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const client = await getClient();
  const config = getCurrentConfig();

  if (!config) {
    throw new Error("AI client not initialized");
  }

  // Automatic status sync in dev whenever AI is active
  getProviderStatus().catch(() => {});

  // Dev Overrides
  const devSettings = devSettingsQueries.getAll();
  const model = devSettings["aiModel"] || config.model;
  // Default values from original code: temp 0.3, max_tokens 2000
  const temperature = devSettings["aiTemperature"]
    ? parseFloat(devSettings["aiTemperature"])
    : 0.3;
  const maxTokens = devSettings["aiMaxTokens"]
    ? parseInt(devSettings["aiMaxTokens"])
    : 2000;

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Log Request
  notifyAILog({
    id: requestId,
    timestamp: startTime,
    endpoint: "chat/completions",
    model: model,
    latencyMs: 0,
    status: "pending",
    request: {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
    },
  });

  try {
    const response = await withTimeout(
      client.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: temperature,
        max_tokens: maxTokens,
      }),
      config.timeout,
      `AI request timed out after ${config.timeout}ms`,
    );

    const content = response.choices[0]?.message?.content;
    const endTime = Date.now();

    notifyAILog({
      id: requestId,
      timestamp: endTime,
      endpoint: "chat/completions",
      model: model,
      latencyMs: endTime - startTime,
      status: "success",
      tokens: response.usage
        ? {
            prompt: response.usage.prompt_tokens,
            completion: response.usage.completion_tokens,
            total: response.usage.total_tokens,
          }
        : undefined,
      response: response,
    });

    if (!content) {
      throw new Error("Empty response from AI provider");
    }

    return content;
  } catch (err: any) {
    const endTime = Date.now();
    notifyAILog({
      id: requestId,
      timestamp: endTime,
      endpoint: "chat/completions",
      model: model,
      latencyMs: endTime - startTime,
      status: "error",
      error: err.message,
    });
    throw err;
  }
}

/**
 * Parse JSON from AI response, handling markdown code blocks and mixed text+JSON.
 *
 * @param text AI response text
 * @returns Parsed JSON object
 */
function parseAIResponse<T>(text: string): T {
  let cleaned = text.trim();

  // Remove markdown code blocks (supports ```json, ```JSON, ```)
  const jsonBlockMatch = cleaned.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  // Extract JSON from mixed text+JSON responses
  // Support both objects {...} and arrays [...]
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");

  // Determine if we have an object or array
  const isObject =
    firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket);
  const isArray =
    firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);

  if (isObject && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  } else if (isArray && lastBracket > firstBracket) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[AI Service] JSON parse failed. Raw text:", text);
    console.error("[AI Service] Cleaned text:", cleaned);
    console.error("[AI Service] Parse error:", errorMsg);
    throw new Error(`Failed to parse AI response: ${errorMsg}`);
  }
}

// ============================================================================
// Quick Capture Analysis
// ============================================================================

import { captureAnalysisTask } from "./ai/tasks/capture-analysis";
import { conceptExtractionTask } from "./ai/tasks/concept-extraction";
import { cardValidationTask } from "./ai/tasks/card-validation";
import { medicalListDetectionTask } from "./ai/tasks/medical-list-detection";
import { vignetteConversionTask } from "./ai/tasks/vignette-conversion";
import { tagSuggestionTask } from "./ai/tasks/tag-suggestion";
import { cardGenerationTask } from "./ai/tasks/card-generation";
import type {
  RawConceptFromAI,
  ConceptExtractionTaskResult,
  CardValidationResult,
  MedicalListDetectionResult,
  VignetteConversionResult,
  TagSuggestionResult,
  CardGenerationResult,
} from "./ai/tasks/types";

/**
 * Analyze quick capture content to auto-populate form fields.
 * Returns null on timeout/failure (never blocks capture).
 *
 * Configuration: electron/ai/tasks/capture-analysis.ts
 *
 * Note: Uses direct client API for JSON mode support (response_format).
 */
export async function analyzeCaptureContent(
  content: string,
): Promise<CaptureAnalysisResult | null> {
  const task = captureAnalysisTask;

  // Check cache first
  const cacheKey = aiCache.key(task.id, content);
  const cached = aiCache.get<CaptureAnalysisResult>(cacheKey);
  if (cached) {
    console.log(`[AI Service] ${task.name} cache hit`);
    return cached;
  }

  // Skip analysis for very short content
  if (!content || content.length < 50) return null;

  try {
    const config = await getProviderConfig();
    const client = await getClient();
    const userPrompt = task.buildUserPrompt({ content });

    // Dev overrides
    const devSettings = devSettingsQueries.getAll();
    const model = devSettings["aiModel"] || config.model;
    const temperature = devSettings["aiTemperature"]
      ? parseFloat(devSettings["aiTemperature"])
      : task.temperature;
    const maxTokens = devSettings["aiMaxTokens"]
      ? parseInt(devSettings["aiMaxTokens"])
      : task.maxTokens;

    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    notifyAILog({
      id: requestId,
      timestamp: startTime,
      endpoint: "chat/completions",
      model: model,
      latencyMs: 0,
      status: "pending",
      request: {
        messages: [
          { role: "system", content: task.systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      reason: "analyzeCaptureContent",
    });

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: task.systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    });

    const endTime = Date.now();
    notifyAILog({
      id: requestId,
      timestamp: endTime,
      endpoint: "chat/completions",
      model: model,
      latencyMs: endTime - startTime,
      status: "success",
      tokens: response.usage
        ? {
            prompt: response.usage.prompt_tokens,
            completion: response.usage.completion_tokens,
            total: response.usage.total_tokens,
          }
        : undefined,
      response: response,
      reason: "analyzeCaptureContent",
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) return null;

    const parsed = parseAIResponse<CaptureAnalysisResult>(resultText);

    // Use task's normalizer
    const result = task.normalizeResult
      ? task.normalizeResult(parsed)
      : parsed || task.fallbackResult!;

    // Cache for configured TTL
    aiCache.set(cacheKey, result, task.cacheTTLMs);

    return result;
  } catch (error) {
    console.error(`[AI Service] ${task.name} failed:`, error);
    return null; // Never throw - allow manual entry
  }
}

// ============================================================================
// Concept Extraction
// ============================================================================

/**
 * Extract learning concepts from pasted medical content.
 * Also detects if content is a medical list.
 *
 * Configuration: electron/ai/tasks/concept-extraction.ts
 *
 * @param content Raw text content to analyze
 * @returns Concepts and list detection result
 */
export async function extractConcepts(
  content: string,
): Promise<ConceptExtractionResult> {
  if (!content.trim()) {
    return {
      concepts: [],
      listDetection: { isList: false, listType: null, items: [] },
    };
  }

  const task = conceptExtractionTask;

  try {
    // Run concept extraction and list detection in parallel
    const [conceptsResponse, listDetection] = await Promise.all([
      withRetry(async () => {
        const userPrompt = task.buildUserPrompt({ content });
        return await callAI(task.systemPrompt, userPrompt);
      }),
      detectMedicalList(content),
    ]);

    console.log(
      "[AI Service] Raw concept extraction response:",
      conceptsResponse,
    );
    const parsed = parseAIResponse<
      ConceptExtractionTaskResult | RawConceptFromAI[]
    >(conceptsResponse);
    console.log("[AI Service] Parsed response:", parsed);

    // Use task normalizer to handle response format
    const normalized = task.normalizeResult
      ? task.normalizeResult(parsed as ConceptExtractionTaskResult)
      : { concepts: [] };

    // Filter and validate concepts before mapping
    const validConcepts = normalized.concepts.filter((c: RawConceptFromAI) => {
      // Normalize field names (handle both 'text'/'concept', 'conceptType'/'type', etc.)
      const text = c.text || c.concept;
      const conceptType = c.conceptType || c.type;
      const confidence = c.confidence;
      const format = c.suggestedFormat || c.format;

      const isValid =
        typeof text === "string" &&
        text.trim().length > 0 &&
        typeof conceptType === "string" &&
        typeof confidence === "number" &&
        (format === "qa" ||
          format === "cloze" ||
          format === "Q&A" ||
          format === "cloze deletion");

      if (!isValid) {
        console.warn("[AI Service] Filtered invalid concept:", c);
      }
      return isValid;
    });

    // Add unique IDs to validated concepts and normalize field names
    const concepts: ExtractedConcept[] = validConcepts.map(
      (concept: RawConceptFromAI, index: number) => {
        const text = concept.text || concept.concept || "";
        const conceptType = concept.conceptType || concept.type || "";
        const format = concept.suggestedFormat || concept.format;
        // Normalize format string
        const normalizedFormat: "qa" | "cloze" =
          format === "Q&A" || format === "qa" ? "qa" : "cloze";

        return {
          id: `concept-${Date.now()}-${index}`,
          text: text,
          conceptType: conceptType,
          confidence: Math.min(1, Math.max(0, concept.confidence)), // Clamp to 0-1
          suggestedFormat: normalizedFormat,
        };
      },
    );

    return {
      concepts,
      listDetection,
    };
  } catch (error) {
    console.error("[AI Service] Concept extraction failed:", error);
    throw error;
  }
}

// ============================================================================
// Card Validation
// ============================================================================

/**
 * Validate a flashcard for quality and adherence to learning principles.
 *
 * Configuration: electron/ai/tasks/card-validation.ts
 *
 * @param front Card front (question or cloze text)
 * @param back Card back (answer)
 * @param cardType Type of card ('qa' or 'cloze')
 * @returns Validation result with warnings and suggestions
 */
export async function validateCard(
  front: string,
  back: string,
  cardType: "qa" | "cloze" = "qa",
): Promise<ValidationResult> {
  if (!front.trim()) {
    return {
      isValid: false,
      warnings: ["Card front is empty"],
      suggestions: ["Add a question or cloze deletion text"],
    };
  }

  if (!back.trim() && cardType === "qa") {
    return {
      isValid: false,
      warnings: ["Card back is empty"],
      suggestions: ["Add an answer to the question"],
    };
  }

  const task = cardValidationTask;

  try {
    const userPrompt = task.buildUserPrompt({ front, back, cardType });

    const response = await withRetry(async () => {
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<CardValidationResult>(response);

    // Use task normalizer
    return task.normalizeResult
      ? task.normalizeResult(parsed)
      : task.fallbackResult!;
  } catch (error) {
    console.error("[AI Service] Card validation failed:", error);
    // Return a permissive result on error - don't block card creation
    return { ...task.fallbackResult!, usedFallback: true };
  }
}

// ============================================================================
// Medical List Detection
// ============================================================================

/**
 * Detect if content is a medical list that should be converted to vignettes.
 *
 * Configuration: electron/ai/tasks/medical-list-detection.ts
 *
 * @param content Content to analyze
 * @returns Detection result with list type and extracted items
 */
export async function detectMedicalList(
  content: string,
): Promise<MedicalListDetection> {
  if (!content.trim()) {
    return { isList: false, listType: null, items: [] };
  }

  // Quick heuristic check before calling AI
  const hasListIndicators =
    content.includes("\n-") ||
    content.includes("\n•") ||
    content.includes("\n1.") ||
    content.includes("\n1)") ||
    /\b(ddx|differential|causes of|steps|algorithm)\b/i.test(content);

  if (!hasListIndicators) {
    return { isList: false, listType: null, items: [] };
  }

  const task = medicalListDetectionTask;

  try {
    const userPrompt = task.buildUserPrompt({ content });

    const response = await withRetry(async () => {
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<MedicalListDetectionResult>(response);

    // Use task normalizer
    return task.normalizeResult
      ? task.normalizeResult(parsed)
      : task.fallbackResult!;
  } catch (error) {
    console.error("[AI Service] Medical list detection failed:", error);
    // Return non-list on error to allow normal processing
    return { ...task.fallbackResult!, usedFallback: true };
  }
}

// ============================================================================
// Vignette Conversion
// ============================================================================

/**
 * Convert a medical list item to a clinical vignette and cloze deletion.
 *
 * Configuration: electron/ai/tasks/vignette-conversion.ts
 *
 * @param listItem The list item to convert (e.g., "Acute MI")
 * @param context Additional context about the list (e.g., "DDx for chest pain")
 * @returns Vignette and cloze versions of the content
 */
export async function convertToVignette(
  listItem: string,
  context: string,
): Promise<VignetteConversion> {
  if (!listItem.trim()) {
    throw new Error("List item is required for vignette conversion");
  }

  const task = vignetteConversionTask;

  try {
    const userPrompt = task.buildUserPrompt({ listItem, context });

    const response = await withRetry(async () => {
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<VignetteConversionResult>(response);

    // Use task normalizer (will throw if invalid)
    return task.normalizeResult ? task.normalizeResult(parsed) : parsed;
  } catch (error) {
    console.error("[AI Service] Vignette conversion failed:", error);
    throw error;
  }
}

// ============================================================================
// Tag Suggestions
// ============================================================================

/**
 * Suggest relevant medical domain tags for content.
 *
 * Configuration: electron/ai/tasks/tag-suggestion.ts
 *
 * @param content Content to analyze for tags
 * @returns Array of suggested tag strings
 */
export async function suggestTags(content: string): Promise<string[]> {
  if (!content.trim()) {
    return [];
  }

  const task = tagSuggestionTask;

  try {
    const userPrompt = task.buildUserPrompt({ content });

    const response = await withRetry(async () => {
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<TagSuggestionResult>(response);

    // Use task normalizer (handles lowercase, trim, filter, limit)
    const result = task.normalizeResult
      ? task.normalizeResult(parsed)
      : task.fallbackResult!;

    return result.tags;
  } catch (error) {
    console.error("[AI Service] Tag suggestion failed:", error);
    // Return empty array on error - tags are optional
    return [];
  }
}

// ============================================================================
// Card Generation
// ============================================================================

/**
 * Generate high-quality flashcards from a specific block of content.
 * Puts highlighted content at START of prompt to avoid "lost in the middle" effect.
 *
 * Configuration: electron/ai/tasks/card-generation.ts
 *
 * @param blockContent The specific text selected for card generation
 * @param topicContext The broader topic context (title, related concepts)
 * @param userIntent Optional user instruction (e.g., "make it a vignette")
 * @returns Array of suggested flashcards with worthiness evaluations
 */
export async function generateCardFromBlock(
  blockContent: string,
  topicContext: string,
  userIntent?: string,
): Promise<CardSuggestion[]> {
  if (!blockContent.trim()) {
    return [];
  }

  const task = cardGenerationTask;

  const cacheKey = aiCache.key(
    task.id,
    blockContent,
    topicContext,
    userIntent || "",
  );
  const cached = aiCache.get<CardSuggestion[]>(cacheKey);
  if (cached) return cached;

  try {
    const userPrompt = task.buildUserPrompt({
      blockContent,
      topicContext,
      userIntent,
    });

    const response = await withRetry(async () => {
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<CardGenerationResult>(response);

    // Use task normalizer (handles format validation, filtering, etc.)
    const result = task.normalizeResult
      ? task.normalizeResult(parsed)
      : task.fallbackResult!;

    // Map CardGenerationSuggestion to CardSuggestion (they have same structure)
    const suggestions = result.suggestions as unknown as CardSuggestion[];

    // Store in cache
    aiCache.set(cacheKey, suggestions, task.cacheTTLMs);

    return suggestions;
  } catch (error) {
    console.error("[AI Service] Card generation failed:", error);
    throw error;
  }
}

// ============================================================================
// Identify Tested Concept
// ============================================================================

import { identifyTestedConceptTask } from "./ai/tasks/identify-tested-concept";
import type { IdentifyConceptResult } from "./ai/tasks/types";

// Re-export for backwards compatibility
export type TestedConceptResult = IdentifyConceptResult;

/**
 * Identify what specific concept or learning point a source is testing.
 * Used to guide the learner when writing their insight.
 *
 * Configuration: electron/ai/tasks/identify-tested-concept.ts
 * Test script: scripts/ai-tests/test-identify-concept-final.cjs
 *
 * @param sourceContent The raw content of the source item
 * @param sourceType The type of source (qbank, article, lecture, etc.)
 * @returns The identified concept and confidence level
 */
export async function identifyTestedConcept(
  sourceContent: string,
  sourceType: string,
): Promise<TestedConceptResult> {
  const task = identifyTestedConceptTask;

  const cacheKey = aiCache.key(task.id, sourceContent, sourceType);
  const cached = aiCache.get<TestedConceptResult>(cacheKey);
  if (cached) return cached;

  const userPrompt = task.buildUserPrompt({ sourceContent, sourceType });

  try {
    const response = await callAI(task.systemPrompt, userPrompt);
    const parsed = parseAIResponse<TestedConceptResult>(response);

    // Use task's normalizer if available, otherwise use parsed result
    const result = task.normalizeResult
      ? task.normalizeResult(parsed)
      : parsed || task.fallbackResult!;

    aiCache.set(cacheKey, result, task.cacheTTLMs);
    return result;
  } catch (error) {
    console.error(`[AI Service] ${task.name} failed:`, error);
    // Return fallback instead of throwing - don't block the user
    return { ...task.fallbackResult!, usedFallback: true };
  }
}

import { elaboratedFeedbackTask } from "./ai/tasks/elaborated-feedback";
import type { ElaboratedFeedbackResult } from "./ai/tasks/types";

/**
 * Generate elaborated feedback for a card the user struggled with.
 *
 * Configuration: electron/ai/tasks/elaborated-feedback.ts
 *
 * @param card Card content (front, back, type)
 * @param topicContext Broader context (topic title, etc.)
 * @param responseTimeMs Optional time user spent before answering
 * @returns Elaborated feedback with pits/pearls
 */
export async function generateElaboratedFeedback(
  card: { front: string; back: string; cardType: string },
  topicContext: string,
  responseTimeMs: number | null,
): Promise<ElaboratedFeedback> {
  const task = elaboratedFeedbackTask;

  const cacheKey = aiCache.key(task.id, card.front, card.back, topicContext);
  const cached = aiCache.get<ElaboratedFeedback>(cacheKey);
  if (cached) return cached;

  const userPrompt = task.buildUserPrompt({
    cardFront: card.front,
    cardBack: card.back,
    cardType: card.cardType,
    topicContext,
    responseTimeMs,
  });

  try {
    const response = await withRetry(async () => {
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<ElaboratedFeedbackResult>(response);

    // Use task's normalizer
    const result = task.normalizeResult
      ? task.normalizeResult(parsed)
      : parsed || task.fallbackResult!;

    aiCache.set(cacheKey, result, task.cacheTTLMs);
    return result;
  } catch (error) {
    console.error(`[AI Service] ${task.name} failed:`, error);
    // Return fallback instead of throwing
    return task.fallbackResult!;
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
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2); // Skip very short words

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
  tf2: Map<string, number>,
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
  maxResults = 5,
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
// Generic Source Metadata Extraction (non-qbank items)
// ============================================================================

/**
 * Extract metadata for non-qbank source items (articles, quickcapture, pdf, etc.)
 * Uses the capture-analysis task to generate title, domain, and tags.
 * Returns in QuestionSummaryResult format for consistency.
 */
async function extractGenericSourceMetadata(
  content: string,
  sourceType: string,
): Promise<QuestionSummaryResult | null> {
  const task = captureAnalysisTask;

  // Validate content length
  if (!content || content.trim().length < 20) {
    console.warn(
      `[AI Service] Content too short for extraction: ${content.length} chars`,
    );
    return null;
  }

  console.log(
    `[AI Service] Extracting metadata for ${sourceType} item using capture-analysis task`,
  );

  // Get config for cache key
  const config = await getProviderConfig();
  const devSettings = devSettingsQueries.getAll();
  const effectiveModel = devSettings["aiModel"] || config.model;

  // Check cache
  const cacheKey = aiCache.key(
    task.id,
    effectiveModel,
    content.substring(0, 500),
  );
  const cached = aiCache.get<QuestionSummaryResult>(cacheKey);
  if (cached) {
    console.log(`[AI Service] ✓ Cache hit for ${sourceType}:`, cached.summary);
    return cached;
  }

  // Build prompt
  const userPrompt = task.buildUserPrompt({ content });

  try {
    const startTime = Date.now();
    const client = await getClient();

    const temperature = devSettings["aiTemperature"]
      ? parseFloat(devSettings["aiTemperature"])
      : task.temperature;
    const maxTokens = devSettings["aiMaxTokens"]
      ? parseInt(devSettings["aiMaxTokens"])
      : task.maxTokens;

    console.log(
      `[AI Service] Using model: ${effectiveModel} | Task: ${task.name}`,
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), task.timeoutMs);

    const requestId = crypto.randomUUID();
    notifyAILog({
      id: requestId,
      timestamp: startTime,
      endpoint: "chat/completions",
      model: effectiveModel,
      latencyMs: 0,
      status: "pending",
      request: {
        messages: [
          { role: "system", content: task.systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      reason: "extractGenericSourceMetadata",
    });

    try {
      const completion = await client.chat.completions.create(
        {
          model: effectiveModel,
          messages: [
            { role: "system", content: task.systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        },
        { signal: controller.signal as any },
      );

      clearTimeout(timeoutId);
      const endTime = Date.now();
      const elapsedMs = endTime - startTime;

      notifyAILog({
        id: requestId,
        timestamp: endTime,
        endpoint: "chat/completions",
        model: effectiveModel,
        latencyMs: elapsedMs,
        status: "success",
        tokens: completion.usage
          ? {
              prompt: completion.usage.prompt_tokens,
              completion: completion.usage.completion_tokens,
              total: completion.usage.total_tokens,
            }
          : undefined,
        response: completion,
        reason: "extractGenericSourceMetadata",
      });

      const responseText =
        completion.choices[0]?.message?.content?.trim() || "";

      console.log(`[AI Service] AI response received (${elapsedMs}ms)`);

      // Parse JSON response
      const parsed = parseAIResponse<{
        title?: string;
        domain?: string;
        tags?: string[];
        extractedFacts?: string[];
      }>(responseText);

      if (!parsed) {
        console.warn("[AI Service] Failed to parse capture-analysis response");
        return null;
      }

      // Convert to QuestionSummaryResult format
      const result: QuestionSummaryResult = {
        summary:
          parsed.title ||
          content.split("\n")[0]?.substring(0, 60) ||
          "Untitled",
        subject: parsed.domain || "General",
        questionType: sourceType as any,
      };

      // Cache the result
      aiCache.set(cacheKey, result, task.cacheTTLMs);

      console.log(`[AI Service] ✅ Extracted ${sourceType} metadata:`, {
        summary: result.summary,
        subject: result.subject,
        duration: `${elapsedMs}ms`,
      });

      return result;
    } catch (aiError) {
      clearTimeout(timeoutId);
      const endTime = Date.now();
      notifyAILog({
        id: requestId,
        timestamp: endTime,
        endpoint: "chat/completions",
        model: effectiveModel,
        latencyMs: endTime - startTime,
        status: "error",
        error: (aiError as any)?.message,
        reason: "extractGenericSourceMetadata",
      });
      throw aiError;
    }
  } catch (error) {
    console.error(
      `[AI Service] ❌ Failed to extract ${sourceType} metadata:`,
      error,
    );
    return null;
  }
}

// ============================================================================
// Flashcard Integrated Analysis (v1.1)
// ============================================================================

import { flashcardAnalysisTask } from "./ai/tasks/flashcard-analysis";
import type {
  FlashcardAnalysisResult,
  FlashcardAnalysisContext,
} from "./ai/tasks/types";

export type { FlashcardAnalysisResult, FlashcardAnalysisContext };

export async function analyzeFlashcard(
  stem: string,
  userAnswer: string,
  correctAnswer: string,
  explanation: string,
  top3VectorMatches: string,
  userRole?: string,
): Promise<FlashcardAnalysisResult | null> {
  const task = flashcardAnalysisTask;
  const config = await getProviderConfig();
  const devSettings = devSettingsQueries.getAll();
  const effectiveModel = devSettings["aiModel"] || config.model;

  // Auto-detect user role from settings if not explicitly provided
  const effectiveRole =
    userRole || settingsQueries.get("userProfile") || "medical student";

  // Interference Detection: If no vector matches provided, run internal search
  let vectorContext = top3VectorMatches;
  if (!vectorContext || vectorContext === "[]") {
    try {
      // 1. Fetch all notes (MVP approach - post-MVP use vector DB)
      const allNotes = noteQueries.getAll();

      // 2. Find semantic matches
      const matches = findRelatedNotes(stem, allNotes, 0.15, 3);

      // 3. Hydrate matches with full content for the AI to analyze
      const hydratedMatches = matches.map((match) => {
        const note = allNotes.find((n) => n.id === match.noteId);
        return {
          id: match.noteId,
          title: note?.title || "Unknown",
          content: note?.content?.substring(0, 300) || "", // Truncate content
          similarity: match.similarity,
        };
      });

      vectorContext = JSON.stringify(hydratedMatches);
      console.log(
        `[AI Service] Interference Detection found ${matches.length} matches`,
      );
    } catch (err) {
      console.warn("[AI Service] Failed to run interference detection:", err);
      // Fallback to empty context on error
      vectorContext = "[]";
    }
  }

  // Build prompt
  const userPrompt = task.buildUserPrompt({
    stem,
    userAnswer,
    correctAnswer,
    explanation,
    top3VectorMatches: vectorContext,
    userRole: effectiveRole,
  });

  try {
    const startTime = Date.now();
    const client = await getClient();
    const temperature = devSettings["aiTemperature"]
      ? parseFloat(devSettings["aiTemperature"])
      : task.temperature;
    const maxTokens = devSettings["aiMaxTokens"]
      ? parseInt(devSettings["aiMaxTokens"])
      : task.maxTokens;

    console.log(
      `[AI Service] Using model: ${effectiveModel} | Task: ${task.name}`,
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), task.timeoutMs);

    const requestId = crypto.randomUUID();
    notifyAILog({
      id: requestId,
      timestamp: startTime,
      endpoint: "chat/completions",
      model: effectiveModel,
      latencyMs: 0,
      status: "pending",
      request: {
        messages: [
          { role: "system", content: task.systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      reason: "analyzeFlashcard",
    });

    try {
      const completion = await client.chat.completions.create(
        {
          model: effectiveModel,
          messages: [
            { role: "system", content: task.systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        },
        { signal: controller.signal as any },
      );

      clearTimeout(timeoutId);
      const endTime = Date.now();
      const elapsedMs = endTime - startTime;

      notifyAILog({
        id: requestId,
        timestamp: endTime,
        endpoint: "chat/completions",
        model: effectiveModel,
        latencyMs: elapsedMs,
        status: "success",
        tokens: completion.usage
          ? {
              prompt: completion.usage.prompt_tokens,
              completion: completion.usage.completion_tokens,
              total: completion.usage.total_tokens,
            }
          : undefined,
        response: completion,
        reason: "analyzeFlashcard",
      });

      const responseText =
        completion.choices[0]?.message?.content?.trim() || "";

      // Parse JSON response
      const parsed = parseAIResponse<FlashcardAnalysisResult>(responseText);
      const result = task.normalizeResult
        ? task.normalizeResult(parsed)
        : parsed;

      return result;
    } catch (aiError) {
      clearTimeout(timeoutId);
      const endTime = Date.now();
      notifyAILog({
        id: requestId,
        timestamp: endTime,
        endpoint: "chat/completions",
        model: effectiveModel,
        latencyMs: endTime - startTime,
        status: "error",
        error: (aiError as any)?.message,
        reason: "analyzeFlashcard",
      });
      throw aiError;
    }
  } catch (error) {
    console.error(`[AI Service] ❌ Failed to analyze flashcard:`, error);
    return task.fallbackResult || null;
  }
}

// ============================================================================
// Question Summary Extraction
// ============================================================================

import { questionSummaryTask } from "./ai/tasks/question-summary";
import type { QuestionSummaryResult } from "./ai/tasks/types";

/**
 * Extract a concise summary for inbox triage differentiation.
 *
 * Configuration: electron/ai/tasks/question-summary.ts
 *
 * Features:
 * - Timeout to prevent hanging (configured in task)
 * - Single retry on transient failures
 * - Comprehensive logging for debugging
 * - Model-aware caching
 *
 * @param content Raw question content (rawContent from SourceItem)
 * @param sourceType Type of source (qbank, article, etc.)
 * @returns Object with summary and subject, or null if extraction fails
 */
export async function extractQuestionSummary(
  content: string,
  sourceType: string,
): Promise<QuestionSummaryResult | null> {
  // For non-qbank items, use capture-analysis task to extract metadata
  if (sourceType !== "qbank") {
    return extractGenericSourceMetadata(content, sourceType);
  }

  const task = questionSummaryTask;

  // Validate content length
  if (!content || content.trim().length < 20) {
    console.warn(
      `[AI Service] Content too short for extraction: ${content.length} chars`,
    );
    return null;
  }

  // Get config for cache key (include model to invalidate on model change)
  const config = await getProviderConfig();

  // Dev overrides
  const devSettings = devSettingsQueries.getAll();
  const effectiveModel = devSettings["aiModel"] || config.model;

  // Check cache (include model in key)
  const cacheKey = aiCache.key(
    task.id,
    effectiveModel,
    content.substring(0, 500),
  );
  const cached = aiCache.get<QuestionSummaryResult>(cacheKey);
  if (cached) {
    console.log(`[AI Service] ✓ Cache hit:`, cached.summary);
    return cached;
  }

  // Build prompts from task config
  const userPrompt = task.buildUserPrompt({ content, sourceType });

  // Retry logic: try once, retry once on failure
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[AI Service] ${task.name} (attempt ${attempt}/2)...`);
      const startTime = Date.now();

      const client = await getClient();

      const temperature = devSettings["aiTemperature"]
        ? parseFloat(devSettings["aiTemperature"])
        : task.temperature;
      const maxTokens = devSettings["aiMaxTokens"]
        ? parseInt(devSettings["aiMaxTokens"])
        : task.maxTokens;

      console.log(
        `[AI Service] Using model: ${effectiveModel} | Task: ${task.name}`,
      );

      // Create AbortController with task-specific timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), task.timeoutMs);

      const requestId = crypto.randomUUID();
      notifyAILog({
        id: requestId,
        timestamp: startTime,
        endpoint: "chat/completions",
        model: effectiveModel,
        latencyMs: 0,
        status: "pending",
        request: {
          messages: [
            { role: "system", content: task.systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        },
        reason: "extractQuestionSummary",
      });

      try {
        const completion = await client.chat.completions.create(
          {
            model: effectiveModel,
            messages: [
              { role: "system", content: task.systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: temperature,
            max_tokens: maxTokens,
          },
          { signal: controller.signal as any },
        );

        clearTimeout(timeoutId);

        const endTime = Date.now();
        const elapsedMs = endTime - startTime;

        notifyAILog({
          id: requestId,
          timestamp: endTime,
          endpoint: "chat/completions",
          model: effectiveModel,
          latencyMs: elapsedMs,
          status: "success",
          tokens: completion.usage
            ? {
                prompt: completion.usage.prompt_tokens,
                completion: completion.usage.completion_tokens,
                total: completion.usage.total_tokens,
              }
            : undefined,
          response: completion,
          reason: "extractQuestionSummary",
        });

        const responseText =
          completion.choices[0]?.message?.content?.trim() || "";

        console.log(`[AI Service] AI response received (${elapsedMs}ms)`);
        console.log("[AI Service] Raw response:", responseText);

        // Parse JSON response
        const parsed = parseAIResponse<QuestionSummaryResult>(responseText);

        // Use task's normalizer
        const result = task.normalizeResult
          ? task.normalizeResult(parsed)
          : parsed || task.fallbackResult!;

        // Validate result has adequate summary
        if (!result.summary || result.summary.split(" ").length < 3) {
          console.warn("[AI Service] Invalid summary format:", result);
          if (attempt < 2) {
            console.log("[AI Service] Retrying in 1 second...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          return null;
        }

        // Cache successful result with task-specific TTL
        aiCache.set(cacheKey, result, task.cacheTTLMs);

        console.log("[AI Service] ✅ Successfully extracted:", {
          summary: result.summary,
          subject: result.subject,
          questionType: result.questionType,
          duration: `${elapsedMs}ms`,
        });

        return result;
      } catch (aiError) {
        clearTimeout(timeoutId);
        const endTime = Date.now();
        notifyAILog({
          id: requestId,
          timestamp: endTime,
          endpoint: "chat/completions",
          model: effectiveModel,
          latencyMs: endTime - startTime,
          status: "error",
          error: (aiError as any)?.message,
          reason: "extractQuestionSummary",
        });
        if ((aiError as any)?.name === "AbortError") {
          console.warn(`[AI Service] ⏱️  Timeout after ${task.timeoutMs}ms`);
          if (attempt < 2) {
            console.log("[AI Service] Retrying in 1 second...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
        }
        throw aiError;
      }
    } catch (error) {
      console.error(
        `[AI Service] ❌ Failed to extract (attempt ${attempt}/2):`,
        error,
      );
      if (error instanceof Error) {
        console.error("[AI Service] Error details:", {
          message: error.message,
          stack: error.stack?.split("\n").slice(0, 3).join("\n"),
        });
      }
      if (attempt < 2) {
        console.log("[AI Service] Retrying in 1 second...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      return null;
    }
  }

  return null;
}

// ============================================================================
// Notebook v2: Quiz System Functions (v24)
// ============================================================================

import {
  extractFactsTask,
  generateQuizTask,
  gradeAnswerTask,
  detectConfusionTask,
  type ExtractFactsResult,
  type ExtractFactsContext,
  type GenerateQuizResult,
  type GenerateQuizContext,
  type GradeAnswerResult,
  type GradeAnswerContext,
  type DetectConfusionResult,
  type DetectConfusionContext,
  type ExtractedFact,
} from "./ai/tasks";

/**
 * Extract testable facts from source content.
 * Used by the Intake Quiz system to generate quiz questions.
 */
export async function extractFacts(
  sourceContent: string,
  sourceType: string,
  topicContext?: string,
): Promise<ExtractFactsResult> {
  if (!sourceContent.trim()) {
    return { facts: [], usedFallback: true };
  }

  const task = extractFactsTask;
  const context: ExtractFactsContext = {
    sourceContent,
    sourceType,
    topicContext,
  };

  try {
    const response = await withRetry(async () => {
      const userPrompt = task.buildUserPrompt(context);
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<ExtractFactsResult>(response);
    const normalized = task.normalizeResult
      ? task.normalizeResult(parsed)
      : { facts: [] };

    console.log(
      `[AI Service] Extracted ${normalized.facts.length} facts from content`,
    );
    return normalized;
  } catch (error) {
    console.error("[AI Service] extractFacts failed:", error);
    return task.fallbackResult || { facts: [], usedFallback: true };
  }
}

/**
 * Generate quiz questions from extracted facts.
 * Creates fill-in-the-blank style questions with key terms removed.
 */
export async function generateQuiz(
  facts: ExtractedFact[],
  topicContext: string,
  maxQuestions = 3,
): Promise<GenerateQuizResult> {
  if (facts.length === 0) {
    return { questions: [], usedFallback: true };
  }

  const task = generateQuizTask;
  const context: GenerateQuizContext = { facts, topicContext, maxQuestions };

  try {
    const response = await withRetry(async () => {
      const userPrompt = task.buildUserPrompt(context);
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<GenerateQuizResult>(response);
    const normalized = task.normalizeResult
      ? task.normalizeResult(parsed)
      : { questions: [] };

    console.log(
      `[AI Service] Generated ${normalized.questions.length} quiz questions`,
    );
    return normalized;
  } catch (error) {
    console.error("[AI Service] generateQuiz failed:", error);
    return task.fallbackResult || { questions: [], usedFallback: true };
  }
}

/**
 * Grade a user's answer against the correct answer using fuzzy matching.
 * Handles synonyms, abbreviations, and partial matches.
 */
export async function gradeAnswer(
  userAnswer: string,
  correctAnswer: string,
  acceptableAnswers: string[],
  questionContext: string,
): Promise<GradeAnswerResult> {
  if (!userAnswer.trim()) {
    return {
      isCorrect: false,
      matchScore: 0,
      feedback: "No answer provided",
      usedFallback: true,
    };
  }

  // Quick exact match check (case-insensitive)
  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedCorrect = correctAnswer.trim().toLowerCase();
  const normalizedAcceptable = acceptableAnswers.map((a) =>
    a.trim().toLowerCase(),
  );

  if (
    normalizedUser === normalizedCorrect ||
    normalizedAcceptable.includes(normalizedUser)
  ) {
    return {
      isCorrect: true,
      matchScore: 1.0,
      feedback: "Correct!",
    };
  }

  // Use AI for fuzzy matching
  const task = gradeAnswerTask;
  const context: GradeAnswerContext = {
    userAnswer,
    correctAnswer,
    acceptableAnswers,
    questionContext,
  };

  try {
    const response = await withRetry(async () => {
      const userPrompt = task.buildUserPrompt(context);
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<GradeAnswerResult>(response);
    const normalized = task.normalizeResult
      ? task.normalizeResult(parsed)
      : { isCorrect: false, matchScore: 0, feedback: "Unable to grade" };

    console.log(
      `[AI Service] Graded answer: ${normalized.isCorrect ? "correct" : "incorrect"} (score: ${normalized.matchScore})`,
    );
    return normalized;
  } catch (error) {
    console.error("[AI Service] gradeAnswer failed:", error);
    return (
      task.fallbackResult || {
        isCorrect: false,
        matchScore: 0,
        feedback: "Unable to grade answer",
        usedFallback: true,
      }
    );
  }
}

/**
 * Detect if a wrong answer indicates confusion between similar concepts.
 * Used to track confusion patterns for disambiguation card generation.
 */
export async function detectConfusion(
  userAnswer: string,
  correctAnswer: string,
  topicContext: string,
  relatedConcepts?: string[],
): Promise<DetectConfusionResult> {
  if (!userAnswer.trim()) {
    return { hasConfusion: false };
  }

  const task = detectConfusionTask;
  const context: DetectConfusionContext = {
    userAnswer,
    correctAnswer,
    topicContext,
    relatedConcepts,
  };

  try {
    const response = await withRetry(async () => {
      const userPrompt = task.buildUserPrompt(context);
      return await callAI(task.systemPrompt, userPrompt);
    });

    const parsed = parseAIResponse<DetectConfusionResult>(response);
    const normalized = task.normalizeResult
      ? task.normalizeResult(parsed)
      : { hasConfusion: false };

    if (normalized.hasConfusion) {
      console.log(
        `[AI Service] Detected confusion: ${normalized.confusedWith} (${normalized.confusionReason})`,
      );
    }
    return normalized;
  } catch (error) {
    console.error("[AI Service] detectConfusion failed:", error);
    return task.fallbackResult || { hasConfusion: false, usedFallback: true };
  }
}

// ============================================================================
// Notebook v4.1: Article Synthesis (Phase 4)
// ============================================================================

/**
 * Synthesize distinct notebook blocks into a cohesive, cited article.
 *
 * @param topicTitle Title of the topic being synthesized
 * @param blocks Array of blocks with content and source IDs
 * @returns Synthesized markdown content
 */
export async function synthesizeArticle(
  topicTitle: string,
  blocks: { content: string; sourceItemId: string }[],
): Promise<ArticleSynthesisResult> {
  const context: ArticleSynthesisContext = {
    topicTitle,
    blocks: blocks.map((b) => ({
      content: b.content,
      sourceItemId: b.sourceItemId,
    })),
  };
  const task = articleSynthesisTask;

  try {
    const response = await withRetry(async () => {
      const userPrompt = task.buildUserPrompt(context);
      return await callAI(task.systemPrompt, userPrompt);
    });

    // Synthesis returns a JSON object with a "markdown" field
    const parsed = parseAIResponse<ArticleSynthesisResult>(response);
    const normalized = task.normalizeResult
      ? task.normalizeResult(parsed)
      : { markdown: "" };

    return normalized;
  } catch (error) {
    console.error("[AI Service] synthesizeArticle failed:", error);
    return task.fallbackResult || { markdown: "", usedFallback: true };
  }
}

// ============================================================================
// AI Utilities
// ============================================================================

export {
  type AIProviderType,
  type AIProviderConfig,
  type AIProviderStatus,
  type ConceptExtractionResult,
  type ExtractedConcept,
  type ValidationResult,
  type MedicalListDetection,
  type VignetteConversion,
  type SemanticMatch,
  type CardSuggestion,
  type WorthinessResult,
  type ElaboratedFeedback,
  type CaptureAnalysisResult,
  type ArticleSynthesisContext, // Phase 4
  type ArticleSynthesisResult, // Phase 4
} from "../src/types/ai";

// Notebook v2: Quiz System Types (v24)
export {
  type ExtractFactsResult,
  type ExtractedFact,
  type GenerateQuizResult,
  type QuizQuestion,
  type GradeAnswerResult,
  type DetectConfusionResult,
} from "./ai/tasks";
