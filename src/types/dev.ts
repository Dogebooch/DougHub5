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
  request?: any;
  response?: any;
  status: "pending" | "success" | "error";
  error?: string;
  reason?: string;
}

// ============================================================================
// Claude Dev Integration Types
// ============================================================================

export interface ClaudeDevMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  screenshot?: string; // Base64 PNG data URL
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
  hasApiKey: boolean;
  model: string;
  error?: string;
}
