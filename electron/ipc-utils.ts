import { BrowserWindow } from "electron";

export type OllamaStatus = "starting" | "started" | "failed" | "already-running";

export interface OllamaStatusPayload {
  status: OllamaStatus;
  message: string;
}

/**
 * Send Ollama status notification to the renderer process.
 * Used to provide real-time feedback during AI service initialization.
 */
export function notifyOllamaStatus(status: OllamaStatus, message: string): void {
  // Use BrowserWindow.getAllWindows()[0] as a simple way to get the main window
  // in a single-window application context.
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send("ai:ollamaStatus", { status, message });
  }
}

export type AIExtractionStatus = "started" | "completed" | "failed";

export interface AIExtractionPayload {
  sourceItemId: string;
  status: AIExtractionStatus;
  metadata?: {
    summary?: string;
    subject?: string;
    questionType?: string;
  };
}

/**
 * Send AI metadata extraction status notification to the renderer process.
 * Used to show real-time extraction progress on inbox items.
 */
export function notifyAIExtraction(payload: AIExtractionPayload): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send("sourceItems:aiExtraction", payload);
  }
}
