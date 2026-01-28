/**
 * Claude Dev Service
 *
 * Provides in-app AI development assistance with screenshot analysis.
 * Uses Claude Code CLI (requires Max subscription with `claude login`).
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
  hasApiKey: boolean; // For CLI, this means "is authenticated via claude login"
  model: string;
  error?: string;
}

interface ClaudeCliResponse {
  type: string;
  subtype?: string;
  is_error: boolean;
  result?: string;
  error?: string;
  session_id?: string;
  duration_ms?: number;
}

// ============================================================================
// Session State
// ============================================================================

let currentSession: {
  id: string;
  messages: ClaudeDevMessage[];
  startedAt: number;
  sessionId?: string; // Claude CLI session ID for --continue
} | null = null;

let cliAvailable: boolean | null = null;

// ============================================================================
// Constants
// ============================================================================

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const SCREENSHOT_DIR = path.join(app.getPath("temp"), "doughub-screenshots");

// ============================================================================
// System Prompt
// ============================================================================

/**
 * Load the system prompt with DougHub context
 */
function getSystemPrompt(currentView: string, workingDirectory: string): string {
  // Try to load copilot instructions
  let projectContext = "";
  try {
    const instructionsPath = path.join(
      workingDirectory,
      ".github",
      "copilot-instructions.md"
    );
    if (fs.existsSync(instructionsPath)) {
      projectContext = fs.readFileSync(instructionsPath, "utf-8");
    }
  } catch (error) {
    console.warn("[ClaudeDev] Could not load copilot instructions:", error);
  }

  return `You are an AI development assistant integrated directly into the DougHub Electron app. You are viewing the app alongside the user and can see screenshots of the current state.

## Your Role
You are the backend and frontend architect for DougHub. When the user asks about UI/UX issues, bugs, or feature requests, you should:
1. Analyze any provided screenshot to understand the current state
2. Identify the relevant files that need modification
3. Provide specific code changes with file paths
4. Explain your reasoning

## Current Context
- **Current View:** ${currentView}
- **Working Directory:** ${workingDirectory}
- **App Type:** Electron + React + TypeScript + Tailwind CSS
- **State Management:** Zustand
- **Database:** SQLite via better-sqlite3

## Project Guidelines
${projectContext || "No project guidelines loaded."}

## How to Help
- When shown a screenshot path, use the Read tool to view it and analyze the UI
- Reference specific elements by their visual appearance and likely component names
- Provide complete, working code changes - no placeholders
- Use the project's existing patterns (IPC, Zustand stores, shadcn/ui components)
- Colors should use theme variables (bg-destructive, text-muted-foreground) not hardcoded Tailwind colors

## File Structure Context
- \`src/components/\` - React components
- \`src/stores/\` - Zustand stores  
- \`electron/\` - Main process (IPC handlers, database)
- \`src/types/\` - TypeScript type definitions

When the user selects a specific element, you'll receive its CSS selector and bounding box. Use this to precisely identify which component to modify.

IMPORTANT: You are running inside the DougHub app itself. Focus on answering questions about the UI and making code changes. Do not try to start servers or run the app - it's already running.`;
}

// ============================================================================
// CLI Detection
// ============================================================================

/**
 * Check if Claude CLI is available and authenticated
 */
async function checkCliAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("claude", ["--version"], {
      shell: true,
      windowsHide: true,
    });

    let output = "";
    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0 && output.includes("Claude Code")) {
        cliAvailable = true;
        resolve(true);
      } else {
        cliAvailable = false;
        resolve(false);
      }
    });

    proc.on("error", () => {
      cliAvailable = false;
      resolve(false);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
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
    model: CLAUDE_MODEL,
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
 * Send a message to Claude via CLI
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

  const workingDirectory = process.cwd();

  // Build the prompt with context
  let fullPrompt = "";

  // Add element context if provided
  if (options.elementInfo) {
    fullPrompt += `[Selected Element]\nSelector: ${options.elementInfo.selector}\nTag: ${options.elementInfo.tagName}\nClass: ${options.elementInfo.className}\nText: ${options.elementInfo.textContent?.slice(0, 200) || "(empty)"}\n\n`;
  }

  // Add screenshot reference if we have one
  const screenshotPath = getLatestScreenshotPath();
  if (screenshotPath && options.screenshot) {
    fullPrompt += `[Screenshot saved at: ${screenshotPath}]\nPlease use the Read tool to view this image and analyze the UI.\n\n`;
  }

  // Add user's message
  fullPrompt += content;

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

  // Build CLI arguments
  const args: string[] = [
    "-p", // Print mode (non-interactive)
    "--output-format", "json",
    "--model", "sonnet", // Use sonnet for speed
    "--system-prompt", getSystemPrompt(options.currentView, workingDirectory),
  ];

  // If we have a previous session, continue it
  if (currentSession!.sessionId) {
    args.push("--resume", currentSession!.sessionId);
  }

  // Add the prompt
  args.push(fullPrompt);

  try {
    console.log(`[ClaudeDev] Sending message via CLI${screenshotPath ? " with screenshot" : ""}`);
    
    const result = await runClaudeCli(args, workingDirectory);
    
    if (result.error) {
      return { response: "", error: result.error };
    }

    // Parse JSON response
    let response: ClaudeCliResponse;
    try {
      response = JSON.parse(result.output);
    } catch {
      // If not JSON, treat as plain text response
      response = {
        type: "result",
        is_error: false,
        result: result.output,
      };
    }

    if (response.is_error || response.type === "error") {
      return { response: "", error: response.error || response.result || "Unknown error" };
    }

    // Save session ID for continuation
    if (response.session_id) {
      currentSession!.sessionId = response.session_id;
    }

    const assistantContent = response.result || "";

    // Store assistant message
    const assistantMessage: ClaudeDevMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantContent,
      timestamp: Date.now(),
    };
    currentSession!.messages.push(assistantMessage);
    notifyClaudeDevMessage(assistantMessage);

    return { response: assistantContent };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ClaudeDev] CLI error:", errorMessage);
    return { response: "", error: errorMessage };
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
    const proc = spawn("claude", args, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ output: stdout.trim() });
      } else {
        resolve({ 
          output: stdout.trim(), 
          error: stderr.trim() || `CLI exited with code ${code}` 
        });
      }
    });

    proc.on("error", (error) => {
      resolve({ output: "", error: error.message });
    });

    // Timeout after 2 minutes (Claude can take a while)
    setTimeout(() => {
      proc.kill();
      resolve({ output: stdout.trim(), error: "Request timed out after 2 minutes" });
    }, 120000);
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
 * Notify renderer of streaming chunk (for future streaming support)
 */
export function notifyClaudeDevChunk(chunk: string): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send("claudeDev:chunk", chunk);
  }
}
