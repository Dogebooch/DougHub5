import * as fs from "node:fs";
import * as path from "node:path";
import { app } from "electron";
import { AIProviderStatus, AIProviderConfig } from "../../src/types/ai";
import { devSettingsQueries } from "../database";

/**
 * Augments the base status with development-specific information:
 * - Runtime settings overrides
 * - Status file path
 * 
 * Then syncs it to a JSON file for external shell access.
 */
export async function augmentAndSyncDevStatus(
  status: AIProviderStatus,
  config: AIProviderConfig,
  availableModels?: string[]
): Promise<AIProviderStatus> {
  // Only augment and sync in dev mode (when NOT packaged)
  if (app.isPackaged) return status;

  try {
    // 1. Apply models if provided
    if (availableModels) {
      status.availableModels = availableModels;
    }

    // 2. Get current settings including dev overrides
    const devSettings = devSettingsQueries.getAll();
    status.model = devSettings["aiModel"] || config.model;
    status.settings = {
      temperature: devSettings["aiTemperature"]
        ? parseFloat(devSettings["aiTemperature"])
        : 0.3,
      maxTokens: devSettings["aiMaxTokens"]
        ? parseInt(devSettings["aiMaxTokens"])
        : 2000,
      baseURL: config.baseURL,
      timeout: config.timeout,
    };
    
    status.statusFilePath = path.join(app.getPath("userData"), "ai-status.json");

    // 3. Sync to file for external shell access
    fs.writeFileSync(status.statusFilePath, JSON.stringify(status, null, 2), "utf8");
  } catch (err) {
    console.error("[AI Dev Sync] Failed to augment or sync status file:", err);
  }

  return status;
}
