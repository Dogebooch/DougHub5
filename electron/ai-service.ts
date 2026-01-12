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
} from "../src/types/ai";
import { type DbNote, settingsQueries } from "./database";
import OpenAI from "openai";
import * as http from "node:http";
import { spawn } from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";
import { notifyOllamaStatus } from "./ipc-utils";

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
// Provider Presets
// ============================================================================

/** Preset configurations for supported AI providers */
export const PROVIDER_PRESETS: Record<AIProviderType, AIProviderConfig> = {
  ollama: {
    type: "openai-compatible",
    baseURL: "http://localhost:11434/v1",
    apiKey: "ollama", // OpenAI SDK requires non-empty string; Ollama ignores it
    model: "qwen2.5:7b-instruct", // Lightweight model for development
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
      "Local AI service is already running."
    );
    return true;
  }

  isStartingOllama = true;
  console.log("[AI Service] Starting Ollama...");
  notifyOllamaStatus("starting", "Starting local AI service (Ollama)...");

  try {
    const exe = findOllamaExecutable();

    // 2. Spawn as detached background process
    const ollamaProcess = spawn(exe, ["serve"], {
      detached: true,
      stdio: "ignore",
      shell: true,
    });

    ollamaProcess.unref();

    // 3. Retry connection check (10 times with 500ms delay)
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (await isOllamaRunning()) {
        console.log("[AI Service] Ollama started successfully");
        notifyOllamaStatus("started", "Local AI service is ready.");
        isStartingOllama = false;
        return true;
      }
    }

    // If loop finished without success
    notifyOllamaStatus(
      "failed",
      "Local AI service failed to respond after starting."
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AI Service] Failed to start Ollama:", err);
    notifyOllamaStatus(
      "failed",
      `Could not start local AI service: ${message}`
    );
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
            const parsed: { models?: Array<{ name: string }> } = JSON.parse(data);
            const models = parsed.models || [];
            const modelNames = models.map((m) => m.name);
            console.log(`[AI Service] Found ${modelNames.length} Ollama models:`, modelNames);
            resolve(modelNames);
          } catch (error) {
            console.error("[AI Service] Failed to parse Ollama models response:", error);
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
  const settingsProvider = settingsQueries.get("aiProvider") as AIProviderType | null;
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
  provider?: AIProviderType
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
  config?: AIProviderConfig
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
    }
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

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "concepts": [
    {
      "text": "Description of the concept",
      "conceptType": "definition|mechanism|treatment|diagnosis|epidemiology",
      "confidence": 0.9,
      "suggestedFormat": "qa|cloze"
    }
  ]
}`,

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

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "tags": ["tag1", "tag2", "tag3"]
}`,

  cardGeneration: `You are a medical education AI assistant that generates high-quality flashcards.
Your goal is to transform the provided medical text into effective, testable, and discrete flashcards.

Worthiness Criteria (Evaluate each card):
1. TESTABLE: Does it have one clear correct answer? (fail: essays, open-ended)
2. ONE CONCEPT: Does it test exactly one retrievable fact? (fail: lists, multiple facts)
3. DISCRIMINATIVE: Does it distinguish from similar concepts? (fail: too generic)

Format Detection Heuristics:
- Procedural keywords (steps, procedure, technique, how to) → format: 'procedural' (use Q&A style)
- List patterns (numbered, "causes of", "types of") → format: 'overlapping-cloze' (generate one card per item)
- Image references or visual descriptions → format: 'image-occlusion' (describe what should be occluded)
- Single fact or definition → format: 'cloze' (use {{c1::answer}} syntax)
- Reasoning, comparison, or "why" questions → format: 'qa'

Guidelines:
- Put clinical scenarios into 'qa' or 'cloze' format.
- For lists, return a separate CardSuggestion for EACH item in the list (overlapping clozes).
- Use green/yellow/red for worthiness ratings.
- Provide brief, specific explanations for worthiness ratings.

CRITICAL for Clinical Vignettes/Patient Scenarios:
- FRONT: Patient demographics, clinical presentation, exam findings, labs (the scenario)
- BACK: Diagnosis, condition name, or specific answer being tested
- Use format: 'qa' (NOT cloze for vignettes)
- Example: front: "37yo woman with bilateral eye redness, photophobia, and pain. Found to have bilateral uveitis." back: "Anterior uveitis (requires urgent ophthalmology referral)"
- NEVER duplicate the scenario in both front and back

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "suggestions": [
    {
      "format": "qa|cloze|overlapping-cloze|image-occlusion|procedural",
      "front": "Front of card",
      "back": "Back of card (if applicable)",
      "confidence": 0.9,
      "worthiness": {
        "testable": "green|yellow|red",
        "oneConcept": "green|yellow|red",
        "discriminative": "green|yellow|red",
        "explanations": {
          "testable": "reason",
          "oneConcept": "reason",
          "discriminative": "reason"
        }
      },
      "formatReason": "Why this format was chosen"
    }
  ]
}`,

  elaboratedFeedback: `You are a medical education AI tutor specializing in boards-style study.
A student just struggled with a flashcard. Your task is to provide concise, high-yield feedback to help them understand the concept.

Analyze the flashcard content, the broader topic context, and the fact that the user struggled (possibly indicated by response time).

Explain:
1. WHY the user might have been confused (whyWrong) - point out common clinical pitfalls or similar-sounding concepts.
2. The core logic or "Clinical Pearl" (whyRight) - explain why the correct answer is correct in a way that sticks.
3. Related concepts or "Differential Pitfalls" (relatedConcepts) - list 2-3 related concepts they should be wary of confusing with this one.

Focus on clinical reasoning and board-relevant facts. Keep it concise (ADHD-friendly).

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{
  "whyWrong": "Explanation of potential confusion or pitfall",
  "whyRight": "High-yield explanation of the correct concept",
  "relatedConcepts": ["Concept A", "Concept B"]
}`,
};

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
  errorMessage = "Operation timed out"
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
      if (lastError.message.includes("timed out") || attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.log(
        `[AI Service] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`
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
  userMessage: string
): Promise<string> {
  const client = await getClient();
  const config = getCurrentConfig();

  if (!config) {
    throw new Error("AI client not initialized");
  }

  const response = await withTimeout(
    client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 2000,
    }),
    config.timeout,
    `AI request timed out after ${config.timeout}ms`
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from AI provider");
  }

  return content;
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
// Concept Extraction
// ============================================================================

/** Response format for concept extraction */
interface ConceptExtractionResponse {
  concepts: Array<{
    text: string;
    conceptType: string;
    confidence: number;
    suggestedFormat: "qa" | "cloze";
  }>;
}

/**
 * Extract learning concepts from pasted medical content.
 * Also detects if content is a medical list.
 *
 * @param content Raw text content to analyze
 * @returns Concepts and list detection result
 */
export async function extractConcepts(
  content: string
): Promise<ConceptExtractionResult> {
  if (!content.trim()) {
    return {
      concepts: [],
      listDetection: { isList: false, listType: null, items: [] },
    };
  }

  try {
    // Run concept extraction and list detection in parallel
    const [conceptsResponse, listDetection] = await Promise.all([
      withRetry(async () => {
        return await callAI(
          PROMPTS.conceptExtraction,
          `Extract learning concepts from this medical content:\n\n${content}`
        );
      }),
      detectMedicalList(content),
    ]);

    console.log(
      "[AI Service] Raw concept extraction response:",
      conceptsResponse
    );
    const parsed = parseAIResponse<
      ConceptExtractionResponse | ExtractedConcept[]
    >(conceptsResponse);
    console.log("[AI Service] Parsed response:", parsed);

    // Handle both {concepts: [...]} and direct array [...] formats
    let conceptsArray: ExtractedConcept[];
    if (Array.isArray(parsed)) {
      // Ollama sometimes returns array directly
      conceptsArray = parsed;
    } else if (
      parsed &&
      Array.isArray((parsed as ConceptExtractionResponse).concepts)
    ) {
      conceptsArray = (parsed as ConceptExtractionResponse).concepts;
    } else {
      console.error(
        "[AI Service] Invalid response structure. Expected {concepts: [...]} or [...]"
      );
      throw new Error(
        "Invalid response structure from AI: missing or invalid concepts array"
      );
    }

    // Filter and validate concepts before mapping
    const validConcepts = conceptsArray.filter((c) => {
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
    const concepts = validConcepts.map((concept, index) => {
      const text = concept.text || concept.concept;
      const conceptType = concept.conceptType || concept.type;
      const format = concept.suggestedFormat || concept.format;
      // Normalize format string
      const normalizedFormat =
        format === "Q&A" || format === "qa" ? "qa" : "cloze";

      return {
        id: `concept-${Date.now()}-${index}`,
        text: text,
        conceptType: conceptType,
        confidence: Math.min(1, Math.max(0, concept.confidence)), // Clamp to 0-1
        suggestedFormat: normalizedFormat as "qa" | "cloze",
      };
    });

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
  cardType: "qa" | "cloze" = "qa"
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

  try {
    const cardContent =
      cardType === "cloze"
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
    console.error("[AI Service] Card validation failed:", error);
    // Return a permissive result on error - don't block card creation
    return {
      isValid: true,
      warnings: ["AI validation unavailable"],
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
  listType: "differential" | "procedure" | "algorithm" | null;
  items: string[];
}

/**
 * Detect if content is a medical list that should be converted to vignettes.
 *
 * @param content Content to analyze
 * @returns Detection result with list type and extracted items
 */
export async function detectMedicalList(
  content: string
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
    console.error("[AI Service] Medical list detection failed:", error);
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
    throw new Error("List item is required for vignette conversion");
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
      throw new Error("Invalid vignette conversion response");
    }

    return {
      vignette: parsed.vignette,
      cloze: parsed.cloze,
    };
  } catch (error) {
    console.error("[AI Service] Vignette conversion failed:", error);
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
      .map((tag) => tag.toLowerCase().trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 5); // Limit to 5 tags
  } catch (error) {
    console.error("[AI Service] Tag suggestion failed:", error);
    // Return empty array on error - tags are optional
    return [];
  }
}

// ============================================================================
// Card Generation
// ============================================================================

/** Response format for card generation */
interface CardGenerationResponse {
  suggestions: CardSuggestion[];
}

/**
 * Generate high-quality flashcards from a specific block of content.
 * Puts highlighted content at START of prompt to avoid "lost in the middle" effect.
 *
 * @param blockContent The specific text selected for card generation
 * @param topicContext The broader topic context (title, related concepts)
 * @param userIntent Optional user instruction (e.g., "make it a vignette")
 * @returns Array of suggested flashcards with worthiness evaluations
 */
export async function generateCardFromBlock(
  blockContent: string,
  topicContext: string,
  userIntent?: string
): Promise<CardSuggestion[]> {
  if (!blockContent.trim()) {
    return [];
  }

  const cacheKey = aiCache.key(
    "generateCard",
    blockContent,
    topicContext,
    userIntent || ""
  );
  const cached = aiCache.get<CardSuggestion[]>(cacheKey);
  if (cached) return cached;

  try {
    // Construct user message with content at the START to avoid "lost in the middle"
    const userMessage = `HIGHLIGHTED CONTENT:
${blockContent}

TOPIC CONTEXT:
${topicContext}

${
  userIntent ? `USER INTENT: ${userIntent}\n` : ""
}Please generate high-quality card suggestions from the highlighted content.`;

    const response = await withRetry(async () => {
      return await callAI(PROMPTS.cardGeneration, userMessage);
    });

    const parsed = parseAIResponse<CardGenerationResponse | CardSuggestion[]>(
      response
    );

    // Handle both {suggestions: [...]} and direct array [...] formats
    let suggestions: CardSuggestion[];
    if (Array.isArray(parsed)) {
      suggestions = parsed;
    } else if (parsed && Array.isArray(parsed.suggestions)) {
      suggestions = parsed.suggestions;
    } else {
      console.error(
        "[AI Service] Invalid card generation response structure:",
        parsed
      );
      throw new Error("Invalid response structure for card generation");
    }

    // Basic normalization and validation
    const normalizedSuggestions = suggestions
      .map((s) => ({
        format: s.format || "qa",
        front: s.front || "",
        back: s.back || "",
        confidence: typeof s.confidence === "number" ? s.confidence : 0.8,
        worthiness: s.worthiness || {
          testable: "yellow",
          oneConcept: "yellow",
          discriminative: "yellow",
          explanations: {
            testable: "Auto-generated",
            oneConcept: "Auto-generated",
            discriminative: "Auto-generated",
          },
        },
        formatReason: s.formatReason || "AI suggestion",
      }))
      .filter((s) => {
        // Validate content quality: detect duplicate front/back
        if (s.front && s.back && s.front.trim() === s.back.trim()) {
          console.warn(`[AI Service] Filtered duplicate card: front === back`, {
            front: s.front.slice(0, 100),
            cacheKey,
          });
          return false;
        }
        // Warn about empty backs for qa/vignette cards
        if (
          (s.format === "qa" || s.format === "procedural") &&
          !s.back?.trim()
        ) {
          console.warn(
            `[AI Service] Card with empty back for format ${s.format}`,
            { front: s.front.slice(0, 100), cacheKey }
          );
          return false;
        }
        return true;
      });

    // Store in cache
    aiCache.set(cacheKey, normalizedSuggestions);

    return normalizedSuggestions;
  } catch (error) {
    console.error("[AI Service] Card generation failed:", error);
    throw error;
  }
}

/**
 * Generate elaborated feedback for a card the user struggled with.
 *
 * @param card Card content (front, back, type)
 * @param topicContext Broader context (topic title, etc.)
 * @param responseTimeMs Optional time user spent before answering
 * @returns Elaborated feedback with pits/pearls
 */
export async function generateElaboratedFeedback(
  card: { front: string; back: string; cardType: string },
  topicContext: string,
  responseTimeMs: number | null
): Promise<ElaboratedFeedback> {
  const cacheKey = aiCache.key(
    "elaboratedFeedback",
    card.front,
    card.back,
    topicContext
  );
  const cached = aiCache.get<ElaboratedFeedback>(cacheKey);
  if (cached) return cached;

  try {
    const userMessage = `FLASHCARD:
Front: ${card.front}
Back: ${card.back}
Type: ${card.cardType}

TOPIC CONTEXT:
${topicContext}

${
  responseTimeMs
    ? `USER RESPONSE TIME: ${responseTimeMs}ms (Student struggled with this card)`
    : "Student struggled with this card/requested feedback."
}

Please provide elaborated feedback.`;

    const response = await withRetry(async () => {
      return await callAI(PROMPTS.elaboratedFeedback, userMessage);
    });

    const result = parseAIResponse<ElaboratedFeedback>(response);

    // Basic normalization
    const feedback: ElaboratedFeedback = {
      whyWrong: result?.whyWrong || "No specific pitfall identified.",
      whyRight: result?.whyRight || "No clinical pearl available.",
      relatedConcepts: Array.isArray(result?.relatedConcepts)
        ? result.relatedConcepts
        : [],
    };

    aiCache.set(cacheKey, feedback);
    return feedback;
  } catch (error) {
    console.error("[AI Service] Elaborated feedback failed:", error);
    throw error;
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
// Question Summary Extraction
// ============================================================================

/**
 * Extract a concise summary for inbox triage differentiation.
 * 
 * Generates a 4-5 word summary that captures the key learning point or
 * clinical question to help users quickly identify questions in their inbox.
 * 
 * Features:
 * - 10 second timeout to prevent hanging
 * - Single retry on transient failures
 * - Comprehensive logging for debugging
 * - Model-aware caching
 * 
 * @param content Raw question content (rawContent from SourceItem)
 * @param sourceType Type of source (qbank, article, etc.)
 * @returns Object with summary, subject, questionType, or null if extraction fails
 */
export async function extractQuestionSummary(
  content: string,
  sourceType: string
): Promise<{
  summary: string;
  subject?: string;
  questionType?: string;
} | null> {
  // Only process qbank questions for now
  if (sourceType !== "qbank") {
    console.log(`[AI Service] Skipping extraction - not qbank (${sourceType})`);
    return null;
  }

  // Validate content length
  if (!content || content.trim().length < 20) {
    console.warn(
      `[AI Service] Content too short for extraction: ${content.length} chars`
    );
    return null;
  }

  // Get config for cache key (include model to invalidate on model change)
  const config = await getProviderConfig();
  
  // Check cache (include model in key)
  const cacheKey = aiCache.key(
    "question-summary",
    config.model,
    content.substring(0, 500)
  );
  const cached = aiCache.get<{
    summary: string;
    subject?: string;
    questionType?: string;
  }>(cacheKey);
  if (cached) {
    console.log("[AI Service] ✓ Cache hit:", cached.summary);
    return cached;
  }

  // Truncate content to first 800 chars for efficiency
  const truncatedContent = content.substring(0, 800);

  const prompt = `You are a medical education AI assistant. Extract a concise summary from this board question.

TASK: Analyze the clinical vignette and question stem to identify the core learning point.

OUTPUT REQUIREMENTS:
1. "summary": 4-5 word clinical question that captures the key decision point
   - Use action verbs: "Managing", "Diagnosing", "Treating", "When to..."
   - Be specific: Include the condition/scenario
   - Examples: 
     * "Managing atrial fibrillation stroke risk"
     * "Diagnosing pulmonary embolism criteria"
     * "When to anticoagulate DVT"

2. "subject": Primary medical specialty (pick ONE most relevant)
   - Options: Cardiology, Pulmonology, Neurology, Gastroenterology, Nephrology, Endocrinology, Rheumatology, Infectious Disease, Emergency Medicine, Critical Care, Hematology, Oncology, Other

3. "questionType": Classification (pick ONE)
   - "Diagnosis" - identifying a condition, using criteria/tests
   - "Management" - treatment decisions, next best step
   - "Mechanism" - pathophysiology, how something works
   - "Risk Stratification" - scoring systems, prognosis
   - "Other" - if none fit

QUESTION CONTENT:
${truncatedContent}

RESPOND ONLY WITH VALID JSON:
{
  "summary": "4-5 word action-oriented clinical question",
  "subject": "Primary specialty",
  "questionType": "Diagnosis|Management|Mechanism|Risk Stratification|Other"
}`;

  // Retry logic: try once, retry once on failure
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(
        `[AI Service] Extracting question summary (attempt ${attempt}/2)...`
      );
      const startTime = Date.now();

      const client = await getClient();

      console.log(`[AI Service] Using model: ${config.model}`);

      // Create AbortController for 10s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const completion = await client.chat.completions.create(
          {
            model: config.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2, // Lower for consistency
            max_tokens: 150,
          },
          { signal: controller.signal as any }
        );

        clearTimeout(timeoutId);

        const elapsedMs = Date.now() - startTime;
        const responseText =
          completion.choices[0]?.message?.content?.trim() || "";

        console.log(`[AI Service] AI response received (${elapsedMs}ms)`);
        console.log("[AI Service] Raw response:", responseText);

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.warn("[AI Service] No JSON found in response:", responseText);
          if (attempt < 2) {
            console.log("[AI Service] Retrying in 1 second...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          return null;
        }

        const result = JSON.parse(jsonMatch[0]);

        // Validate result
        if (!result.summary || result.summary.split(" ").length < 3) {
          console.warn("[AI Service] Invalid summary format:", result);
          if (attempt < 2) {
            console.log("[AI Service] Retrying in 1 second...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          return null;
        }

        // Cache successful result
        aiCache.set(cacheKey, result);

        console.log("[AI Service] ✅ Successfully extracted:", {
          summary: result.summary,
          subject: result.subject,
          type: result.questionType,
          duration: `${elapsedMs}ms`,
        });

        return {
          summary: result.summary,
          subject: result.subject || undefined,
          questionType: result.questionType || undefined,
        };
      } catch (aiError) {
        clearTimeout(timeoutId);
        if ((aiError as any)?.name === "AbortError") {
          console.warn("[AI Service] ⏱️  Timeout after 10s");
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
        error
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
// Exports
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
} from "../src/types/ai";
