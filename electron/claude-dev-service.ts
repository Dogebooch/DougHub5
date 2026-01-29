/**
 * Claude Dev Service
 *
 * Provides in-app AI development assistance with screenshot analysis.
 * Uses Claude Code CLI (requires Max subscription with `claude login`).
 *
 * Features:
 * - Streaming responses with real-time updates
 * - File context injection (auto-detects React component source)
 * - Conversation history persistence
 * - Model selection (haiku/sonnet/opus)
 * - Cost tracking with token usage
 */

import { BrowserWindow, app } from "electron";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

// ============================================================================
// Types
// ============================================================================

export interface ClaudeDevMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  screenshot?: string;
  elementInfo?: ElementInfo;
  isStreaming?: boolean;
  model?: ClaudeModel;
  usage?: TokenUsage;
  cost?: CostInfo;
}

export interface ElementInfo {
  selector: string;
  tagName: string;
  className: string;
  id?: string;
  textContent?: string;
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ClaudeDevStatus {
  isConnected: boolean;
  hasApiKey: boolean;
  model: ClaudeModel;
  error?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

export interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface SessionStats {
  messageCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  startedAt: number;
}

export interface SavedConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ClaudeDevMessage[];
  metadata: {
    messageCount: number;
    lastView: string;
    model: ClaudeModel;
  };
}

export interface StreamChunk {
  messageId: string;
  content: string;
  fullContent: string;
  /** Type of chunk: text, tool_use, tool_result */
  chunkType?: "text" | "tool_use" | "tool_result" | "init";
  /** Tool name when chunkType is tool_use */
  toolName?: string;
  /** Tool input when chunkType is tool_use */
  toolInput?: Record<string, unknown>;
  /** Tool result preview when chunkType is tool_result */
  toolResultPreview?: string;
}

interface ComponentContext {
  filePath: string;
  componentName: string;
  source: string;
  lineCount: number;
}

interface ClaudeCliJsonResponse {
  type: string;
  subtype?: string;
  is_error: boolean;
  result?: string;
  error?: string;
  session_id?: string;
  duration_ms?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

interface ConversationHistory {
  version: 1;
  conversations: SavedConversation[];
}

// ============================================================================
// Constants
// ============================================================================

export const AVAILABLE_MODELS = [
  { id: "haiku" as const, name: "Haiku", description: "Fastest, simple tasks" },
  { id: "sonnet" as const, name: "Sonnet", description: "Balanced (default)" },
  { id: "opus" as const, name: "Opus", description: "Most capable, complex tasks" },
] as const;

export type ClaudeModel = (typeof AVAILABLE_MODELS)[number]["id"];

// Pricing per 1M tokens (as of January 2026)
const MODEL_PRICING: Record<ClaudeModel, { input: number; output: number }> = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3.0, output: 15.0 },
  opus: { input: 15.0, output: 75.0 },
};

const SCREENSHOT_DIR = path.join(app.getPath("temp"), "doughub-screenshots");
const HISTORY_FILE = "claude-dev-history.json";
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 100;

// View name to component file mapping
const VIEW_COMPONENT_MAP: Record<string, string> = {
  inbox: "src/components/knowledgebank/InboxView.tsx",
  knowledgebank: "src/components/knowledgebank/KnowledgeBankView.tsx",
  notebook: "src/components/notebook/NotebookView.tsx",
  review: "src/components/review/ReviewInterface.tsx",
  cards: "src/components/cards/CardBrowserView.tsx",
  settings: "src/components/settings/SettingsView.tsx",
  weak: "src/components/smartviews/WeakTopicsView.tsx",
  home: "src/components/layout/HomeView.tsx",
};

// ============================================================================
// Session State
// ============================================================================

let currentSession: {
  id: string;
  messages: ClaudeDevMessage[];
  startedAt: number;
  sessionId?: string; // Claude CLI session ID for --continue
  lastView?: string;
} | null = null;

let cliAvailable: boolean | null = null;
let selectedModel: ClaudeModel = "sonnet";

let sessionStats: SessionStats = {
  messageCount: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  estimatedCost: 0,
  startedAt: Date.now(),
};

// ============================================================================
// Model Selection
// ============================================================================

/**
 * Get the list of available models
 */
export function getAvailableModels(): typeof AVAILABLE_MODELS {
  return AVAILABLE_MODELS;
}

/**
 * Get the currently selected model
 */
export function getSelectedModel(): ClaudeModel {
  return selectedModel;
}

/**
 * Set the selected model
 */
export function setSelectedModel(model: ClaudeModel): void {
  if (AVAILABLE_MODELS.some((m) => m.id === model)) {
    selectedModel = model;
    console.log(`[ClaudeDev] Model changed to: ${model}`);
  } else {
    console.warn(`[ClaudeDev] Invalid model: ${model}, keeping ${selectedModel}`);
  }
}

// ============================================================================
// Cost Tracking
// ============================================================================

/**
 * Calculate cost from token usage
 */
function calculateCost(usage: TokenUsage, model: ClaudeModel): CostInfo {
  const pricing = MODEL_PRICING[model];
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Update session stats with new usage data
 */
function updateSessionStats(usage: TokenUsage, model: ClaudeModel): void {
  sessionStats.messageCount++;
  sessionStats.totalInputTokens += usage.inputTokens;
  sessionStats.totalOutputTokens += usage.outputTokens;

  const cost = calculateCost(usage, model);
  sessionStats.estimatedCost += cost.totalCost;
}

/**
 * Reset session stats
 */
function resetSessionStats(): void {
  sessionStats = {
    messageCount: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCost: 0,
    startedAt: Date.now(),
  };
}

/**
 * Get current session stats
 */
export function getSessionStats(): SessionStats {
  return { ...sessionStats };
}

// ============================================================================
// Conversation History
// ============================================================================

/**
 * Get the path to the history file
 */
function getHistoryPath(): string {
  return path.join(app.getPath("userData"), HISTORY_FILE);
}

/**
 * Load conversation history from disk
 */
function loadConversationHistory(): ConversationHistory {
  const historyPath = getHistoryPath();
  if (!fs.existsSync(historyPath)) {
    return { version: 1, conversations: [] };
  }

  try {
    const data = fs.readFileSync(historyPath, "utf-8");
    const parsed = JSON.parse(data) as ConversationHistory;
    // Validate structure
    if (!parsed.version || !Array.isArray(parsed.conversations)) {
      return { version: 1, conversations: [] };
    }
    return parsed;
  } catch (error) {
    console.error("[ClaudeDev] Failed to load history:", error);
    return { version: 1, conversations: [] };
  }
}

/**
 * Save conversation history to disk
 */
function saveConversationHistory(history: ConversationHistory): void {
  const historyPath = getHistoryPath();
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error("[ClaudeDev] Failed to save history:", error);
  }
}

/**
 * Save the current session to history
 */
function saveCurrentSession(): void {
  if (!currentSession || currentSession.messages.length === 0) return;

  const history = loadConversationHistory();

  // Find existing or create new conversation
  let conversation = history.conversations.find((c) => c.id === currentSession!.id);

  if (!conversation) {
    // Generate title from first user message
    const firstUserMsg = currentSession.messages.find((m) => m.role === "user");
    const title = firstUserMsg?.content.slice(0, 50) || "New Conversation";

    conversation = {
      id: currentSession.id,
      title: title + (title.length >= 50 ? "..." : ""),
      createdAt: currentSession.startedAt,
      updatedAt: Date.now(),
      messages: [],
      metadata: {
        messageCount: 0,
        lastView: currentSession.lastView || "",
        model: selectedModel,
      },
    };
    history.conversations.unshift(conversation);
  }

  // Update conversation
  conversation.messages = currentSession.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
  conversation.updatedAt = Date.now();
  conversation.metadata.messageCount = currentSession.messages.length;
  conversation.metadata.model = selectedModel;
  conversation.metadata.lastView = currentSession.lastView || "";

  // Prune old conversations
  history.conversations = history.conversations.slice(0, MAX_CONVERSATIONS);

  saveConversationHistory(history);
}

/**
 * Get conversation history (without full messages for list view)
 */
export function getConversationHistory(): Omit<SavedConversation, "messages">[] {
  const history = loadConversationHistory();
  return history.conversations.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    metadata: c.metadata,
  }));
}

/**
 * Load a specific conversation by ID
 */
export function loadConversation(id: string): SavedConversation | null {
  const history = loadConversationHistory();
  return history.conversations.find((c) => c.id === id) || null;
}

/**
 * Delete a conversation from history
 */
export function deleteConversation(id: string): void {
  const history = loadConversationHistory();
  history.conversations = history.conversations.filter((c) => c.id !== id);
  saveConversationHistory(history);
}

/**
 * Rename a conversation
 */
export function renameConversation(id: string, title: string): void {
  const history = loadConversationHistory();
  const conversation = history.conversations.find((c) => c.id === id);
  if (conversation) {
    conversation.title = title;
    saveConversationHistory(history);
  }
}

// ============================================================================
// File Context Injection
// ============================================================================

/**
 * Find the React component source file for a given element
 */
function findComponentSource(
  elementInfo: ElementInfo,
  workingDirectory: string
): ComponentContext | null {
  const searchPaths = [
    "src/components",
    "src/components/dev",
    "src/components/notebook",
    "src/components/layout",
    "src/components/ui",
    "src/components/cards",
    "src/components/review",
    "src/components/settings",
    "src/components/knowledgebank",
    "src/components/smartviews",
    "src/components/modals",
    "src/components/shared",
    "src/components/search",
  ];

  // Extract potential component names from className (PascalCase patterns)
  const classNames = elementInfo.className.split(" ");
  const pascalCaseClasses = classNames.filter((c) => /^[A-Z][a-zA-Z]+$/.test(c));

  for (const potentialName of pascalCaseClasses) {
    for (const searchPath of searchPaths) {
      const fullPath = path.join(workingDirectory, searchPath, `${potentialName}.tsx`);
      if (fs.existsSync(fullPath)) {
        try {
          const source = fs.readFileSync(fullPath, "utf-8");
          return {
            filePath: fullPath.replace(workingDirectory, "").replace(/\\/g, "/"),
            componentName: potentialName,
            source: source.slice(0, 5000), // Limit to ~5KB
            lineCount: source.split("\n").length,
          };
        } catch {
          // File read failed, continue searching
        }
      }
    }
  }

  return null;
}

/**
 * Get the component path for the current view
 */
function getViewComponentPath(currentView: string, workingDirectory: string): string | null {
  const relativePath = VIEW_COMPONENT_MAP[currentView];
  if (!relativePath) return null;

  const fullPath = path.join(workingDirectory, relativePath);
  return fs.existsSync(fullPath) ? fullPath : null;
}

// ============================================================================
// System Prompt
// ============================================================================

/**
 * Load project context from CLAUDE.md
 */
function loadProjectContext(workingDirectory: string): string {
  // Try CLAUDE.md first (primary project instructions)
  const claudeMdPath = path.join(workingDirectory, "CLAUDE.md");
  if (fs.existsSync(claudeMdPath)) {
    try {
      return fs.readFileSync(claudeMdPath, "utf-8");
    } catch (error) {
      console.warn("[ClaudeDev] Could not load CLAUDE.md:", error);
    }
  }

  // Fallback to copilot instructions
  const copilotPath = path.join(workingDirectory, ".github", "copilot-instructions.md");
  if (fs.existsSync(copilotPath)) {
    try {
      return fs.readFileSync(copilotPath, "utf-8");
    } catch (error) {
      console.warn("[ClaudeDev] Could not load copilot instructions:", error);
    }
  }

  return "";
}

/**
 * Load the system prompt with DougHub context
 */
function getSystemPrompt(currentView: string, workingDirectory: string): string {
  const projectContext = loadProjectContext(workingDirectory);

  return `You are an AI development assistant integrated directly into the DougHub Electron app.

## Your Role
You are helping the user debug, improve, and extend the DougHub application. The app is currently running and you are viewing it alongside the user.

When the user describes issues or requests:
1. Analyze any provided context (screenshot paths, element selectors, current view)
2. Identify the relevant source files
3. Provide specific, complete code changes with file paths
4. Explain your reasoning briefly

## Runtime Context
- **Current View:** ${currentView}
- **Working Directory:** ${workingDirectory}
- **Stack:** Electron + React 18 + TypeScript + Tailwind CSS + Zustand + SQLite

## Key Directories
- \`src/components/\` - React components (UI)
- \`src/stores/\` - Zustand stores (state management)
- \`electron/\` - Main process (IPC handlers, database, services)
- \`src/types/\` - TypeScript type definitions

## Project Guidelines
${projectContext || "(No CLAUDE.md found - using defaults)"}

## Important Notes
- The app is ALREADY RUNNING. Don't try to start servers or build.
- Use theme variables for colors (bg-destructive, text-muted-foreground), never hardcoded Tailwind colors.
- Follow existing patterns: IPC with IpcResult<T>, Zustand for state, shadcn/ui components.
- Provide complete code - no placeholders or TODOs.
- When you see a screenshot path, you can use the Read tool to view the image.`;
}

// ============================================================================
// CLI Detection
// ============================================================================

/**
 * Get the Claude CLI command - tries common install locations on Windows
 */
function getClaudeCommand(): string {
  console.log(`[ClaudeDev] getClaudeCommand called, platform=${process.platform}`);

  if (process.platform === "win32") {
    // Try common Windows install locations
    const homedir = process.env.USERPROFILE || process.env.HOME || "";
    console.log(`[ClaudeDev] Home directory: ${homedir}`);

    const candidates = [
      path.join(homedir, ".local", "bin", "claude.exe"),
      path.join(homedir, "AppData", "Roaming", "npm", "claude.cmd"),
      path.join(homedir, "AppData", "Local", "Programs", "claude", "claude.exe"),
    ];

    for (const candidate of candidates) {
      console.log(`[ClaudeDev] Checking: ${candidate}`);
      if (fs.existsSync(candidate)) {
        console.log(`[ClaudeDev] Found CLI at: ${candidate}`);
        return candidate;
      }
    }
    console.log(`[ClaudeDev] No CLI found in standard locations`);
  }
  // Fallback to just "claude" and hope it's in PATH
  console.log(`[ClaudeDev] Falling back to "claude" in PATH`);
  return "claude";
}

let claudeCommand: string | null = null;

/**
 * Check if Claude CLI is available and authenticated
 */
async function checkCliAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log("[ClaudeDev] Checking CLI availability...");

    // Find the claude command
    claudeCommand = getClaudeCommand();
    console.log(`[ClaudeDev] Using command: ${claudeCommand}`);

    const proc = spawn(claudeCommand, ["--version"], {
      shell: true,
      windowsHide: true,
      env: { ...process.env },
    });

    // Track for cleanup
    import("./process-manager").then(({ processManager }) => {
      processManager.track(proc);
    });

    let output = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      console.log(`[ClaudeDev] CLI check completed - code: ${code}, output: "${output.trim()}", stderr: "${stderr.trim()}"`);
      if (code === 0 && output.includes("Claude Code")) {
        cliAvailable = true;
        console.log("[ClaudeDev] CLI is available!");
        resolve(true);
      } else {
        cliAvailable = false;
        console.log("[ClaudeDev] CLI not available or check failed");
        resolve(false);
      }
    });

    proc.on("error", (err) => {
      console.error("[ClaudeDev] CLI spawn error:", err.message);
      cliAvailable = false;
      resolve(false);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      console.warn("[ClaudeDev] CLI check timed out");
      proc.kill();
      cliAvailable = false;
      resolve(false);
    }, 5000);
  });
}

/**
 * Reset the CLI available cache
 */
export function resetClaudeDevClient(): void {
  cliAvailable = null;
  console.log("[ClaudeDev] Client cache reset");
}

// ============================================================================
// Status & Screenshot
// ============================================================================

/**
 * Get current status of Claude Dev integration
 */
export async function getClaudeDevStatus(): Promise<ClaudeDevStatus> {
  if (cliAvailable === null) {
    await checkCliAvailable();
  }

  return {
    isConnected: cliAvailable === true,
    hasApiKey: cliAvailable === true, // For CLI, this means authenticated
    model: selectedModel,
    error: cliAvailable ? undefined : "Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code",
  };
}

/**
 * Ensure screenshot directory exists
 */
function ensureScreenshotDir(): void {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

/**
 * Capture screenshot of the app window and save to temp file
 */
export async function captureScreenshot(rect?: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Promise<string | null> {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win || win.isDestroyed()) {
    console.error("[ClaudeDev] No window available for screenshot");
    return null;
  }

  try {
    const image = rect
      ? await win.webContents.capturePage(rect)
      : await win.webContents.capturePage();

    // Save to temp file for CLI to read
    ensureScreenshotDir();
    const filename = `screenshot-${Date.now()}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filepath, image.toPNG());

    // Also return data URL for UI preview
    return image.toDataURL();
  } catch (error) {
    console.error("[ClaudeDev] Screenshot capture failed:", error);
    return null;
  }
}

/**
 * Get the most recent screenshot file path
 */
function getLatestScreenshotPath(): string | null {
  try {
    if (!fs.existsSync(SCREENSHOT_DIR)) return null;
    
    const files = fs.readdirSync(SCREENSHOT_DIR)
      .filter(f => f.startsWith("screenshot-") && f.endsWith(".png"))
      .map(f => ({
        name: f,
        path: path.join(SCREENSHOT_DIR, f),
        time: fs.statSync(path.join(SCREENSHOT_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    return files[0]?.path || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Start a new Claude Dev session
 */
export function startSession(): string {
  const sessionId = crypto.randomUUID();
  currentSession = {
    id: sessionId,
    messages: [],
    startedAt: Date.now(),
  };
  // Reset stats for new session
  resetSessionStats();
  console.log(`[ClaudeDev] Session started: ${sessionId}`);
  return sessionId;
}

/**
 * End the current session
 */
export function endSession(): void {
  if (currentSession) {
    console.log(`[ClaudeDev] Session ended: ${currentSession.id}`);
    currentSession = null;
  }
  
  // Clean up old screenshots
  try {
    if (fs.existsSync(SCREENSHOT_DIR)) {
      const files = fs.readdirSync(SCREENSHOT_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(SCREENSHOT_DIR, file));
      }
    }
  } catch (error) {
    console.warn("[ClaudeDev] Failed to clean up screenshots:", error);
  }
}

/**
 * Get current session messages
 */
export function getSessionMessages(): ClaudeDevMessage[] {
  return currentSession?.messages ?? [];
}

/**
 * Clear session messages
 */
export function clearSessionMessages(): void {
  if (currentSession) {
    currentSession.messages = [];
    currentSession.sessionId = undefined; // Reset CLI session too
    console.log(`[ClaudeDev] Messages cleared for session: ${currentSession.id}`);
  }
}

// ============================================================================
// Messaging via Claude CLI
// ============================================================================

/**
 * Build the prompt with context hints (element info, screenshot path)
 * Claude has full tool access so we just provide hints, not full file contents
 */
function buildPromptWithContext(
  content: string,
  options: {
    screenshot?: string;
    elementInfo?: ElementInfo;
    currentView: string;
  },
  workingDirectory: string
): string {
  const parts: string[] = [];

  // Add element context if user selected an element
  if (options.elementInfo) {
    parts.push(`[Selected Element: ${options.elementInfo.tagName}${options.elementInfo.id ? `#${options.elementInfo.id}` : ""} class="${options.elementInfo.className}"]`);
    if (options.elementInfo.textContent) {
      parts.push(`[Element Text: "${options.elementInfo.textContent.slice(0, 100)}${options.elementInfo.textContent.length > 100 ? "..." : ""}"]`);
    }
  }

  // Add screenshot path if we captured one
  const screenshotPath = getLatestScreenshotPath();
  if (screenshotPath && options.screenshot) {
    parts.push(`[Screenshot available at: ${screenshotPath}]`);
  }

  // Add the view component hint so Claude knows which file to look at
  const viewComponentPath = getViewComponentPath(options.currentView, workingDirectory);
  if (viewComponentPath) {
    const relativePath = viewComponentPath.replace(workingDirectory, "").replace(/\\/g, "/").replace(/^\//, "");
    parts.push(`[Current view component: ${relativePath}]`);
  }

  // Add user's message
  parts.push(content);

  return parts.join("\n\n");
}

/**
 * Send a message to Claude via CLI (non-streaming)
 */
export async function sendMessage(
  content: string,
  options: {
    screenshot?: string;
    elementInfo?: ElementInfo;
    currentView: string;
  }
): Promise<{ response: string; error?: string }> {
  // Check CLI availability
  if (cliAvailable === null) {
    await checkCliAvailable();
  }

  if (!cliAvailable) {
    return {
      response: "",
      error: "Claude Code CLI not available. Install with: npm install -g @anthropic-ai/claude-code",
    };
  }

  if (!currentSession) {
    startSession();
  }

  currentSession!.lastView = options.currentView;
  const workingDirectory = process.cwd();

  // Build the prompt with full context
  const fullPrompt = buildPromptWithContext(content, options, workingDirectory);

  // Store user message
  const userMessage: ClaudeDevMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content,
    timestamp: Date.now(),
    screenshot: options.screenshot,
    elementInfo: options.elementInfo,
  };
  currentSession!.messages.push(userMessage);
  notifyClaudeDevMessage(userMessage);

  // Write system prompt to a temp file (CLI reads from file)
  const systemPromptPath = path.join(SCREENSHOT_DIR, "system-prompt.txt");
  ensureScreenshotDir();
  fs.writeFileSync(systemPromptPath, getSystemPrompt(options.currentView, workingDirectory));

  // Build CLI arguments for non-interactive mode with JSON output
  const args: string[] = [
    "--print",
    "--output-format", "json", // Get structured output with usage info
    "--model", selectedModel,
    "--system-prompt", systemPromptPath,
    "--dangerously-skip-permissions",
  ];

  // If we have a previous session, continue it
  if (currentSession!.sessionId) {
    args.push("--resume", currentSession!.sessionId);
  }

  args.push(fullPrompt);

  try {
    console.log(`[ClaudeDev] Sending message via CLI (model: ${selectedModel})...`);

    const result = await runClaudeCli(args, workingDirectory);

    if (result.error && !result.output) {
      const assistantMessage: ClaudeDevMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${result.error}`,
        timestamp: Date.now(),
        model: selectedModel,
      };
      currentSession!.messages.push(assistantMessage);
      notifyClaudeDevMessage(assistantMessage);
      saveCurrentSession();
      return { response: "", error: result.error };
    }

    // Parse JSON response
    let assistantContent = result.output;
    let usage: TokenUsage | undefined;
    let cost: CostInfo | undefined;

    try {
      const parsed: ClaudeCliJsonResponse = JSON.parse(result.output);
      if (parsed.result) {
        assistantContent = parsed.result;
      } else if (parsed.error) {
        assistantContent = `Error: ${parsed.error}`;
      }

      // Save session ID
      if (parsed.session_id) {
        currentSession!.sessionId = parsed.session_id;
      }

      // Extract usage info
      if (parsed.usage) {
        usage = {
          inputTokens: parsed.usage.input_tokens,
          outputTokens: parsed.usage.output_tokens,
          cacheCreationTokens: parsed.usage.cache_creation_input_tokens,
          cacheReadTokens: parsed.usage.cache_read_input_tokens,
        };
        cost = calculateCost(usage, selectedModel);
        updateSessionStats(usage, selectedModel);
      }
    } catch {
      // Not JSON, use raw output
    }

    // Store assistant message
    const assistantMessage: ClaudeDevMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantContent || "(No response received)",
      timestamp: Date.now(),
      model: selectedModel,
      usage,
      cost,
    };
    currentSession!.messages.push(assistantMessage);
    notifyClaudeDevMessage(assistantMessage);
    saveCurrentSession();

    return { response: assistantContent };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ClaudeDev] CLI error:", errorMessage);

    const assistantMessage: ClaudeDevMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Error: ${errorMessage}`,
      timestamp: Date.now(),
      model: selectedModel,
    };
    currentSession!.messages.push(assistantMessage);
    notifyClaudeDevMessage(assistantMessage);
    saveCurrentSession();

    return { response: "", error: errorMessage };
  }
}

/**
 * Send a message to Claude via CLI with streaming response
 */
export async function sendMessageStreaming(
  content: string,
  options: {
    screenshot?: string;
    elementInfo?: ElementInfo;
    currentView: string;
  }
): Promise<{ error?: string }> {
  console.log(`[ClaudeDev] sendMessageStreaming called, cliAvailable=${cliAvailable}`);

  // Check CLI availability
  if (cliAvailable === null) {
    console.log(`[ClaudeDev] CLI availability unknown, checking...`);
    await checkCliAvailable();
    console.log(`[ClaudeDev] CLI check done, cliAvailable=${cliAvailable}`);
  }

  if (!cliAvailable) {
    console.log(`[ClaudeDev] CLI not available, returning error`);
    return {
      error: "Claude Code CLI not available. Install with: npm install -g @anthropic-ai/claude-code",
    };
  }

  if (!currentSession) {
    startSession();
  }

  currentSession!.lastView = options.currentView;
  const workingDirectory = process.cwd();

  // Build the prompt with full context
  const fullPrompt = buildPromptWithContext(content, options, workingDirectory);

  // Store user message
  const userMessage: ClaudeDevMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content,
    timestamp: Date.now(),
    screenshot: options.screenshot,
    elementInfo: options.elementInfo,
  };
  currentSession!.messages.push(userMessage);
  notifyClaudeDevMessage(userMessage);

  // Create placeholder assistant message for streaming
  const assistantMessageId = crypto.randomUUID();
  const assistantMessage: ClaudeDevMessage = {
    id: assistantMessageId,
    role: "assistant",
    content: "",
    timestamp: Date.now(),
    isStreaming: true,
    model: selectedModel,
  };
  currentSession!.messages.push(assistantMessage);
  notifyClaudeDevMessage(assistantMessage);

  // Build CLI arguments for streaming
  // Note: --verbose is required for stream-json to work
  // Note: We don't pass prompt as argument - we'll pipe it via stdin to avoid Windows shell escaping issues
  //
  // We run the CLI from the project directory so it picks up:
  // - CLAUDE.md (project instructions)
  // - .mcp.json (MCP servers like code-index and taskmaster-ai)
  // - .claude/settings.json (permissions)
  const args: string[] = [
    "--print",
    "--output-format", "stream-json",
    "--verbose",
    "--model", selectedModel,
    "--dangerously-skip-permissions",
  ];

  // Add context about current view to help Claude understand what the user is looking at
  const contextPrefix = `[Current View: ${options.currentView}]\n\n`;

  if (currentSession!.sessionId) {
    args.push("--resume", currentSession!.sessionId);
  }
  // Prompt will be piped via stdin

  try {
    console.log(`[ClaudeDev] Streaming message via CLI (model: ${selectedModel})...`);

    const result = await runClaudeCliStreaming(args, workingDirectory, contextPrefix + fullPrompt, (chunk) => {
      try {
        const parsed = JSON.parse(chunk);

        // Handle different message types in stream-json format
        if (parsed.type === "system" && parsed.subtype === "init") {
          // Session initialization - notify UI that connection is established
          if (parsed.session_id) {
            currentSession!.sessionId = parsed.session_id;
          }
          notifyClaudeDevChunk({
            messageId: assistantMessageId,
            content: "",
            fullContent: assistantMessage.content,
            chunkType: "init",
          });
        } else if (parsed.type === "assistant" && parsed.message?.content) {
          // Content block from assistant - can be text or tool_use
          for (const block of parsed.message.content) {
            if (block.type === "text" && block.text) {
              assistantMessage.content += block.text;
              notifyClaudeDevChunk({
                messageId: assistantMessageId,
                content: block.text,
                fullContent: assistantMessage.content,
                chunkType: "text",
              });
            } else if (block.type === "tool_use") {
              // Tool call - format and display it
              const toolText = `\n🔧 **${block.name}**`;
              assistantMessage.content += toolText;
              notifyClaudeDevChunk({
                messageId: assistantMessageId,
                content: toolText,
                fullContent: assistantMessage.content,
                chunkType: "tool_use",
                toolName: block.name,
                toolInput: block.input as Record<string, unknown>,
              });
            }
          }
        } else if (parsed.type === "user" && parsed.message?.content) {
          // Tool result - show a preview
          for (const block of parsed.message.content) {
            if (block.type === "tool_result") {
              // Extract preview from tool result (first 200 chars)
              let resultPreview = "";
              if (typeof block.content === "string") {
                resultPreview = block.content.slice(0, 200);
              } else if (block.content) {
                resultPreview = JSON.stringify(block.content).slice(0, 200);
              }
              if (resultPreview.length >= 200) {
                resultPreview += "...";
              }

              const toolResultText = `\n   ↳ ${resultPreview.split("\n")[0]}`;
              assistantMessage.content += toolResultText;
              notifyClaudeDevChunk({
                messageId: assistantMessageId,
                content: toolResultText,
                fullContent: assistantMessage.content,
                chunkType: "tool_result",
                toolResultPreview: resultPreview,
              });
            }
          }
        } else if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          // Delta update (streaming text)
          assistantMessage.content += parsed.delta.text;
          notifyClaudeDevChunk({
            messageId: assistantMessageId,
            content: parsed.delta.text,
            fullContent: assistantMessage.content,
            chunkType: "text",
          });
        } else if (parsed.type === "message_stop" || parsed.type === "result") {
          // Message complete - extract usage
          if (parsed.usage) {
            assistantMessage.usage = {
              inputTokens: parsed.usage.input_tokens || 0,
              outputTokens: parsed.usage.output_tokens || 0,
            };
            assistantMessage.cost = calculateCost(assistantMessage.usage, selectedModel);
            updateSessionStats(assistantMessage.usage, selectedModel);
          }
          if (parsed.session_id) {
            currentSession!.sessionId = parsed.session_id;
          }
          // For result type, use the final result text if we don't have content
          if (parsed.type === "result" && parsed.result && !assistantMessage.content.trim()) {
            assistantMessage.content = parsed.result;
            notifyClaudeDevChunk({
              messageId: assistantMessageId,
              content: parsed.result,
              fullContent: assistantMessage.content,
              chunkType: "text",
            });
          }
        }
      } catch {
        // Plain text chunk (fallback)
        if (chunk.trim()) {
          assistantMessage.content += chunk;
          notifyClaudeDevChunk({
            messageId: assistantMessageId,
            content: chunk,
            fullContent: assistantMessage.content,
            chunkType: "text",
          });
        }
      }
    });

    // Mark streaming complete
    assistantMessage.isStreaming = false;
    if (!assistantMessage.content) {
      assistantMessage.content = "(No response received)";
    }

    notifyClaudeDevStreamEnd(assistantMessageId);
    saveCurrentSession();

    if (result.error) {
      return { error: result.error };
    }

    return {};
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ClaudeDev] Streaming error:", errorMessage);

    assistantMessage.isStreaming = false;
    assistantMessage.content = `Error: ${errorMessage}`;
    notifyClaudeDevStreamEnd(assistantMessageId);
    saveCurrentSession();

    return { error: errorMessage };
  }
}

/**
 * Run Claude CLI and capture output
 */
function runClaudeCli(
  args: string[],
  cwd: string
): Promise<{ output: string; error?: string }> {
  return new Promise((resolve) => {
    const cmd = claudeCommand || getClaudeCommand();
    console.log(`[ClaudeDev] Spawning: ${cmd} ${args.map(a => a.length > 100 ? a.slice(0, 100) + "..." : a).join(" ")}`);

    const proc = spawn(cmd, args, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env },
    });

    // Track for cleanup
    import("./process-manager").then(({ processManager }) => {
      processManager.track(proc);
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      // Log progress for long-running requests
      if (stdout.length % 1000 < chunk.length) {
        console.log(`[ClaudeDev] Received ${stdout.length} bytes...`);
      }
    });

    proc.stderr?.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      // Log stderr immediately as it often contains useful info
      console.log(`[ClaudeDev] stderr: ${chunk.trim()}`);
    });

    proc.on("close", (code) => {
      console.log(`[ClaudeDev] Process exited with code ${code}`);
      console.log(`[ClaudeDev] stdout length: ${stdout.length}, stderr length: ${stderr.length}`);

      if (code === 0) {
        resolve({ output: stdout.trim() });
      } else {
        // Even on non-zero exit, return output if we have it
        // (Claude CLI sometimes exits non-zero but still produces valid output)
        resolve({
          output: stdout.trim(),
          error: stderr.trim() || (stdout.trim() ? undefined : `CLI exited with code ${code}`),
        });
      }
    });

    proc.on("error", (error) => {
      console.error(`[ClaudeDev] Spawn error:`, error);
      resolve({ output: "", error: error.message });
    });

    // Timeout after 3 minutes (Claude can take a while for complex requests)
    const timeoutId = setTimeout(() => {
      console.warn(`[ClaudeDev] Request timed out after 3 minutes`);
      proc.kill();
      resolve({ output: stdout.trim(), error: "Request timed out after 3 minutes" });
    }, 180000);

    proc.on("close", () => clearTimeout(timeoutId));
  });
}

// ============================================================================
// Renderer Notifications
// ============================================================================

/**
 * Notify renderer of new Claude message
 */
function notifyClaudeDevMessage(message: ClaudeDevMessage): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send("claudeDev:message", message);
  }
}

/**
 * Notify renderer of streaming chunk
 */
function notifyClaudeDevChunk(chunk: StreamChunk): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send("claudeDev:chunk", chunk);
  }
}

/**
 * Notify renderer that streaming has ended
 */
function notifyClaudeDevStreamEnd(messageId: string): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send("claudeDev:streamEnd", messageId);
  }
}

/**
 * Run Claude CLI with streaming output
 * @param stdinContent - Content to pipe to stdin (the prompt)
 */
function runClaudeCliStreaming(
  args: string[],
  cwd: string,
  stdinContent: string,
  onChunk: (chunk: string) => void
): Promise<{ error?: string }> {
  return new Promise((resolve) => {
    const cmd = claudeCommand || getClaudeCommand();
    console.log(`[ClaudeDev] Spawning (streaming): ${cmd} ${args.slice(0, 5).join(" ")} ...`);
    console.log(`[ClaudeDev] Prompt length: ${stdinContent.length} chars`);

    const proc = spawn(cmd, args, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env },
    });

    // Track for cleanup
    import("./process-manager").then(({ processManager }) => {
      processManager.track(proc);
    });

    // Write prompt to stdin and close it
    if (proc.stdin) {
      console.log(`[ClaudeDev] Writing ${stdinContent.length} chars to stdin...`);
      proc.stdin.write(stdinContent);
      proc.stdin.end();
      console.log(`[ClaudeDev] stdin closed`);
    } else {
      console.error(`[ClaudeDev] No stdin available!`);
    }

    let stderr = "";
    let receivedAnyOutput = false;

    proc.stdout?.on("data", (data) => {
      if (!receivedAnyOutput) {
        console.log(`[ClaudeDev] First stdout data received!`);
        receivedAnyOutput = true;
      }
      const text = data.toString();
      console.log(`[ClaudeDev] stdout chunk (${text.length} chars): ${text.slice(0, 200)}...`);
      const lines = text.split("\n").filter((line: string) => line.trim());
      for (const line of lines) {
        onChunk(line);
      }
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
      console.log(`[ClaudeDev] stderr: ${data.toString().trim()}`);
    });

    proc.on("spawn", () => {
      console.log(`[ClaudeDev] Process spawned successfully`);
    });

    proc.on("close", (code) => {
      console.log(`[ClaudeDev] Streaming process exited with code ${code}`);
      if (code !== 0 && stderr) {
        resolve({ error: stderr.trim() });
      } else {
        resolve({});
      }
    });

    proc.on("error", (error) => {
      console.error(`[ClaudeDev] Streaming spawn error:`, error);
      resolve({ error: error.message });
    });

    // Timeout after 5 minutes for streaming (longer than non-streaming)
    const timeoutId = setTimeout(() => {
      console.warn(`[ClaudeDev] Streaming request timed out after 5 minutes`);
      proc.kill();
      resolve({ error: "Request timed out after 5 minutes" });
    }, 300000);

    proc.on("close", () => clearTimeout(timeoutId));
  });
}
