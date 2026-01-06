import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OpenAI from "openai";
import * as http from "node:http";
import * as fs from "node:fs";
import * as os from "node:os";
import { spawn } from "node:child_process";
import * as aiService from "../../electron/ai-service";
import { aiCache } from "../../electron/ai-service";

// Mock electron
vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn(),
  },
  app: {
    getPath: vi.fn(() => "/mock/path"),
    isPackaged: false,
  },
}));

// Mock node:fs
vi.mock("node:fs", () => {
  const existsSync = vi.fn();
  return {
    existsSync,
    default: { existsSync },
  };
});

// Mock node:os
vi.mock("node:os", () => {
  const platform = vi.fn();
  return {
    platform,
    default: { platform },
  };
});

// Mock node:child_process
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

// Mock OpenAI
vi.mock("openai", () => {
  const OpenAI = vi.fn();
  OpenAI.prototype.chat = {
    completions: {
      create: vi.fn(),
    },
  };
  return { default: OpenAI };
});

// Mock node:http
vi.mock("node:http", () => {
  const get = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    destroy: vi.fn().mockReturnThis(),
  }));
  return {
    get,
    default: { get },
  };
});

describe("AI Service", () => {
  const mockOpenAI = new OpenAI() as any;

  beforeEach(() => {
    vi.clearAllMocks();
    aiCache.clear();
    aiService.resetOllamaState();
    process.env["AI_PROVIDER"] = undefined;
    process.env["AI_BASE_URL"] = undefined;
    process.env["AI_API_KEY"] = undefined;
    process.env["AI_MODEL"] = undefined;

    // Default mock implementation for http.get (Ollama not running)
    vi.mocked(http.get).mockImplementation((_url, callback) => {
      if (callback) (callback as any)({ statusCode: 404, resume: vi.fn() });
      return {
        on: vi.fn().mockReturnThis(),
        setTimeout: vi.fn().mockReturnThis(),
        destroy: vi.fn().mockReturnThis(),
      } as any;
    });

    // Default mock implementation for getClient/initializeClient
    vi.spyOn(aiService, "getClient").mockResolvedValue(mockOpenAI);
    vi.spyOn(aiService, "getCurrentConfig").mockReturnValue(
      aiService.PROVIDER_PRESETS.ollama
    );
  });

  describe("Provider Detection", () => {
    it("should detect Ollama when available (returns 200)", async () => {
      vi.mocked(http.get).mockImplementation((_url, callback) => {
        const res = { statusCode: 200, resume: vi.fn() };
        if (callback) (callback as any)(res);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      const provider = await aiService.detectProvider();
      expect(provider).toBe("ollama");
    });

    it("should fall back when Ollama is unavailable (returns 404)", async () => {
      vi.mocked(http.get).mockImplementation((_url, callback) => {
        const res = { statusCode: 404, resume: vi.fn() };
        if (callback) (callback as any)(res);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      const provider = await aiService.detectProvider();
      expect(provider).toBe("ollama"); // Defaults to ollama if no env var
    });

    it("should fall back to AI_PROVIDER environment variable", async () => {
      // Mock Ollama failure
      vi.mocked(http.get).mockImplementation((_url, _callback) => {
        const req = { on: vi.fn(), destroy: vi.fn() };
        return req as any;
      });
      // Simulate error event
      vi.mocked(http.get).mockImplementation((_url, _callback) => {
        const req = {
          on: vi.fn((event, cb) => {
            if (event === "error") setTimeout(() => cb(new Error("fail")), 0);
          }),
          destroy: vi.fn(),
        };
        return req as any;
      });

      process.env["AI_PROVIDER"] = "openai";
      const provider = await aiService.detectProvider();
      expect(provider).toBe("openai");
    });
  });

  describe("Core Functions", () => {
    it("extractConcepts should parse concepts correctly", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                concepts: [
                  {
                    text: "Concept 1",
                    conceptType: "definition",
                    confidence: 0.9,
                    suggestedFormat: "qa",
                  },
                  {
                    text: "Concept 2",
                    conceptType: "mechanism",
                    confidence: 0.8,
                    suggestedFormat: "cloze",
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await aiService.extractConcepts("Some medical text");

      expect(result.concepts).toHaveLength(2);
      expect(result.concepts[0].text).toBe("Concept 1");
      expect(result.concepts[1].suggestedFormat).toBe("cloze");
    });

    it("validateCard should return quality warnings", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isValid: false,
                warnings: ["Too broad"],
                suggestions: ["Split into two"],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await aiService.validateCard("What is X?", "Y");

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain("Too broad");
    });

    it("detectMedicalList should identify lists", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isList: true,
                listType: "differential",
                items: ["Item 1", "Item 2"],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const content = "Causes of cough:\n1. A\n2. B";
      const result = await aiService.detectMedicalList(content);

      expect(result.isList).toBe(true);
      expect(result.items).toHaveLength(2);
    });

    it("convertToVignette should generate vignettes", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                vignette: "A 45yo male...",
                cloze: "Patient has {{c1::MI}}",
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await aiService.convertToVignette(
        "Acute MI",
        "DDx for chest pain"
      );

      expect(result.vignette).toContain("45yo");
      expect(result.cloze).toContain("{{c1::MI}}");
    });

    it("suggestTags should return relevant tags", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                tags: ["cardiology", "diagnosis"],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await aiService.suggestTags("Heart failure stuff");

      expect(result).toContain("cardiology");
      expect(result).toContain("diagnosis");
    });

    it("findRelatedNotes should use keyword similarity", () => {
      const notes = [
        { id: "1", title: "Heart failure", content: "Dyspnea and edema" },
        { id: "2", title: "Pneumonia", content: "Fever and cough" },
      ] as any[];

      // Use a higher threshold to filter out weak matches like just "and"
      const results = aiService.findRelatedNotes(
        "patient has heart failure and edema",
        notes,
        0.3
      );

      expect(results).toHaveLength(1);
      expect(results[0].noteId).toBe("1");
      expect(results[0].similarity).toBeGreaterThan(0.5);
    });
  });

  describe("Infrastructure", () => {
    it("withRetry should retry on failure", async () => {
      vi.useFakeTimers();

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ concepts: [] }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValue(mockResponse);

      // We need to wrap the call in a promise that we can await while advancing timers
      const promise = aiService.extractConcepts("text");

      // Advance timers for retries
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.concepts).toEqual([]);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it("aiCache should store and retrieve values with TTL", async () => {
      vi.useFakeTimers();

      const key = aiCache.key("test", "content");
      aiCache.set(key, { data: "val" }, 1000);

      expect(aiCache.get(key)).toEqual({ data: "val" });

      // Advance time beyond TTL
      vi.advanceTimersByTime(1100);

      expect(aiCache.get(key)).toBeNull();

      vi.useRealTimers();
    });

    it("aiCache should generate keys based on content", () => {
      const key1 = aiCache.key("op", "content1");
      const key2 = aiCache.key("op", "content1");
      const key3 = aiCache.key("op", "content2");

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  describe("Ollama Management", () => {
    describe("isOllamaRunning", () => {
      it("should return true when Ollama returns 200 status", async () => {
        vi.mocked(http.get).mockImplementation((_url, callback) => {
          const res = { statusCode: 200, resume: vi.fn() };
          if (callback) (callback as any)(res);
          return { on: vi.fn(), destroy: vi.fn(), setTimeout: vi.fn() } as any;
        });

        const result = await aiService.isOllamaRunning();
        expect(result).toBe(true);
      });

      it("should return false when Ollama returns non-200 status", async () => {
        vi.mocked(http.get).mockImplementation((_url, callback) => {
          const res = { statusCode: 500, resume: vi.fn() };
          if (callback) (callback as any)(res);
          return { on: vi.fn(), destroy: vi.fn(), setTimeout: vi.fn() } as any;
        });

        const result = await aiService.isOllamaRunning();
        expect(result).toBe(false);
      });

      it("should return false on request error", async () => {
        vi.mocked(http.get).mockImplementation((_url, _callback) => {
          return {
            on: vi.fn((event, cb) => {
              if (event === "error")
                setTimeout(() => cb(new Error("connection failed")), 0);
              return { on: vi.fn() };
            }),
            setTimeout: vi.fn(),
            destroy: vi.fn(),
          } as any;
        });

        const result = await aiService.isOllamaRunning();
        expect(result).toBe(false);
      });

      it("should return false on timeout", async () => {
        vi.mocked(http.get).mockImplementation((_url, _callback) => {
          return {
            on: vi.fn((event, cb) => {
              if (event === "timeout") setTimeout(() => cb(), 0);
              return { on: vi.fn() };
            }),
            setTimeout: vi.fn(),
            destroy: vi.fn(),
          } as any;
        });

        const result = await aiService.isOllamaRunning();
        expect(result).toBe(false);
      });
    });

    describe("findOllamaExecutable", () => {
      it("should return Windows-specific path on win32 if it exists", () => {
        vi.mocked(os.platform).mockReturnValue("win32");
        vi.mocked(fs.existsSync).mockReturnValue(true);
        process.env["LOCALAPPDATA"] = "C:\\Users\\Test\\AppData\\Local";

        const result = aiService.findOllamaExecutable();
        expect(result).toContain("ollama.exe");
        expect(result).toContain("Local\\Programs\\Ollama");
      });

      it("should return Unix-specific path on linux/darwin if it exists", () => {
        vi.mocked(os.platform).mockReturnValue("linux");
        vi.mocked(fs.existsSync).mockReturnValue(true);

        const result = aiService.findOllamaExecutable();
        expect(result).toBe("/usr/local/bin/ollama");
      });

      it('should fallback to just "ollama" if executable not found at common paths', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = aiService.findOllamaExecutable();
        expect(result).toBe("ollama");
      });
    });

    describe("ensureOllamaRunning", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("should return true immediately if Ollama is already running", async () => {
        // Mock isOllamaRunning to return true
        vi.mocked(http.get).mockImplementation((_url, callback) => {
          const res = { statusCode: 200, resume: vi.fn() };
          if (callback) (callback as any)(res);
          return { on: vi.fn(), destroy: vi.fn(), setTimeout: vi.fn() } as any;
        });

        const result = await aiService.ensureOllamaRunning();
        expect(result).toBe(true);
        expect(spawn).not.toHaveBeenCalled();
      });

      it("should spawn Ollama and eventually return true on success", async () => {
        // Mock isOllamaRunning to fail initially, then succeed
        let attempts = 0;
        vi.mocked(http.get).mockImplementation((_url, callback) => {
          attempts++;
          const status = attempts > 2 ? 200 : 500; // Success on 3rd attempt
          const res = { statusCode: status, resume: vi.fn() };
          if (callback) (callback as any)(res);
          return { on: vi.fn(), destroy: vi.fn(), setTimeout: vi.fn() } as any;
        });

        vi.mocked(spawn).mockReturnValue({ unref: vi.fn() } as any);

        const promise = aiService.ensureOllamaRunning();

        // Fast-forward through retries
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result).toBe(true);
        expect(spawn).toHaveBeenCalled();
      });

      it("should return false if retries are exhausted", async () => {
        // Mock isOllamaRunning to always fail
        vi.mocked(http.get).mockImplementation((_url, callback) => {
          const res = { statusCode: 500, resume: vi.fn() };
          if (callback) (callback as any)(res);
          return { on: vi.fn(), destroy: vi.fn(), setTimeout: vi.fn() } as any;
        });

        vi.mocked(spawn).mockReturnValue({ unref: vi.fn() } as any);

        const promise = aiService.ensureOllamaRunning();

        // Fast-forward through all 10 retries
        await vi.runAllTimersAsync();

        const result = await promise;
        expect(result).toBe(false);
        expect(spawn).toHaveBeenCalled();
      });
    });
  });
});
