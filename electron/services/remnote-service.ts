import { DbSourceItem } from "../database/types";
import { AdvisorResult } from "../ai/tasks/advisor-task";

const REMNOTE_PLUGIN_URL = "http://localhost:3003/api/import";

interface RemNoteExportPayload {
  sourceId: string;
  title: string;
  url?: string;
  content: string;
  notes?: string;
  advisorAnalysis?: AdvisorResult;
  tags: string[];
  sourceType: string;
  capturedAt: string;
}

export async function exportToRemNote(
  item: DbSourceItem,
  advisorAnalysis?: AdvisorResult,
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: RemNoteExportPayload = {
      sourceId: item.id,
      title: item.title,
      url: item.sourceUrl,
      content: item.rawContent,
      notes: item.notes,
      advisorAnalysis,
      tags: typeof item.tags === "string" ? JSON.parse(item.tags) : item.tags,
      sourceType: item.sourceType,
      capturedAt: item.createdAt,
    };

    const response = await fetch(REMNOTE_PLUGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `RemNote plugin responded with ${response.status}: ${response.statusText}`,
      );
    }

    const result = await response.json();
    return { success: result.success, error: result.error };
  } catch (error) {
    console.error("[RemNote Service] Export failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to RemNote plugin. Is it running?",
    };
  }
}
