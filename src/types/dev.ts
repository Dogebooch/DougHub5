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
