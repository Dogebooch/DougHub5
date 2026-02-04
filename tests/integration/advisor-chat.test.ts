/**
 * Integration test for Advisor Chat (Neural Link)
 *
 * Tests the specific 'advisor' task used by the sidecar chat.
 */

import { describe, it, expect, beforeAll } from "vitest";
import http from "node:http";
import * as aiService from "../../electron/ai-service";
import { AITaskConfig } from "../../electron/ai/tasks/types";

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

    // Ensure it's running (this will try to spawn it if not running)
    const running = await aiService.ensureOllamaRunning();
    if (!running) {
      throw new Error("Could not start Ollama for testing.");
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
    expect(result.summary).toContain("Kawasaki");
    // Kawasaki is board/high yield
    expect(result.relevance).toMatch(/board_high_yield|clinical_reference/);

    // Should mention IVIG or Aspirin
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
    // Should likely be low yield or handled gracefully
    // The prompt says "expert Medical Education Advisor", so it might try to relate it or dismiss it.
    // We just check valid JSON and schema.
    expect(result).toHaveProperty("relevance");
  }, 30000);
});
