/**
 * Integration test for Advisor Chat (Neural Link)
 *
 * Tests the specific 'advisor' task used by the sidecar chat.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import http from "node:http";

// 1. Mock Electron and IPC Utils
vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
  app: {
    getPath: () => "C:/tmp",
  },
}));

vi.mock("../../electron/ipc-utils", () => ({
  notifyOllamaStatus: vi.fn(),
  notifyAILog: vi.fn(),
  notifyAIExtraction: vi.fn(),
  notifyNewSourceItem: vi.fn(),
}));

// 2. Mock Database Settings
// This prevents "Database not initialized" errors when ai-service tries to check settings
vi.mock("../../electron/database/settings", () => ({
  settingsQueries: {
    get: vi.fn().mockImplementation((key) => {
      // Default mock values
      if (key === "aiProvider") return "ollama";
      if (key === "ollamaModel") return "qwen2.5:7b-instruct";
      return null;
    }),
    getAll: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("../../electron/database/dev-settings", () => ({
  devSettingsQueries: {
    get: vi.fn().mockReturnValue(null),
    getAll: vi.fn().mockReturnValue({}),
  },
}));

import * as aiService from "../../electron/ai-service";

// Check if Ollama is available
async function checkOllama(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:11434/api/tags", (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on("error", () => resolve(false));
    setTimeout(() => {
      req.destroy();
      resolve(false);
    }, 2000);
  });
}

describe("Advisor Chat Integration Tests", () => {
  beforeAll(async () => {
    const isAvailable = await checkOllama();
    if (!isAvailable) {
      console.warn(
        "⚠️ Ollama is NOT running. Attempting to start it via service...",
      );
    }

    // Force Ollama provider
    process.env["AI_PROVIDER"] = "ollama";

    // Initialize with Ollama config
    await aiService.initializeClient(aiService.PROVIDER_PRESETS.ollama);

    // Ensure it's running
    const running = await aiService.ensureOllamaRunning();
    if (!running && !isAvailable) {
      console.warn(
        "Could not start Ollama. Test might fail if Ollama is not manually started.",
      );
    }
  });

  it("should provide high-yield advice for a medical topic", async () => {
    const query = "Treatment for Kawasaki Disease";
    const userNotes = "I remember CRASH and BURN mnemonic.";

    console.log("\n🧪 Testing Advisor Task with Query:", query);

    const result = await aiService.runAITask("advisor", {
      content: query,
      userNotes: userNotes,
      sourceType: "user_query",
    });

    console.log("✅ Advisor Response:", JSON.stringify(result, null, 2));

    expect(result).toBeDefined();
    // Schema checks
    expect(result).toHaveProperty("relevance");
    expect(result).toHaveProperty("advice");
    expect(result).toHaveProperty("cardRecommendations");

    // Logical checks
    expect(result.summary).toBeDefined();
    // Kawasaki is board/high yield
    expect(result.relevance).toMatch(
      /board_high_yield|clinical_reference|low_yield/,
    );

    // Should mention IVIG or Aspirin if the model is decent
    const adviceAndRecs = JSON.stringify(result).toLowerCase();
    expect(adviceAndRecs).toMatch(/aspirin|ivig|immunoglobulin/);
  }, 60000);

  it("should handle non-medical chatter appropriately", async () => {
    const query = "What is the capital of France?";

    console.log("\n🧪 Testing Advisor Task with Non-Medical Query:", query);

    const result = await aiService.runAITask("advisor", {
      content: query,
      userNotes: "",
      sourceType: "user_query",
    });

    console.log("✅ Advisor Response:", JSON.stringify(result, null, 2));

    expect(result).toBeDefined();
    expect(result).toHaveProperty("relevance");
  }, 30000);
});
