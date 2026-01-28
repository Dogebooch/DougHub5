export interface DevSettings {
  aiModel?: string; // Override
  aiTemperature?: number; // Override
  aiMaxTokens?: number; // Override
  // Feature flags
  autoTagging?: boolean;
}

export interface AILogEntry {
  id: string;
  timestamp: number;
  endpoint: string; // "chat/completions" or similar
  model: string;
  latencyMs: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  request?: unknown;
  response?: unknown;
  status: "pending" | "success" | "error";
  error?: string;
  reason?: string;
}

// ============================================================================
// Claude Dev Integration Types
// ============================================================================

/** Available Claude models for the dev panel */
export const AVAILABLE_MODELS = [
  { id: "haiku", name: "Haiku", description: "Fastest, simple tasks" },
  { id: "sonnet", name: "Sonnet", description: "Balanced (default)" },
  { id: "opus", name: "Opus", description: "Most capable, complex tasks" },
] as const;

export type ClaudeModel = (typeof AVAILABLE_MODELS)[number]["id"];

/** Token usage from Claude CLI response */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

/** Cost breakdown for a message */
export interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/** Accumulated session statistics */
export interface SessionStats {
  messageCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  startedAt: number;
}

/** Saved conversation for history persistence */
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

/** Streaming chunk data sent via IPC */
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

export interface ClaudeDevMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  screenshot?: string; // Base64 PNG data URL
  elementInfo?: ElementInfo;
  isStreaming?: boolean; // True while response is streaming
  model?: ClaudeModel; // Model used for this message
  usage?: TokenUsage; // Token usage for assistant messages
  cost?: CostInfo; // Cost for assistant messages
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
