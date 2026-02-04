// Add to your existing API definition or create a new file src/api/advisor.ts

import { AdvisorResult } from "../../electron/ai/tasks/advisor-task";

export async function getAdvisorAnalysis(
  content: string,
  userNotes: string,
  sourceType: string,
): Promise<AdvisorResult> {
  // Assuming a generic runTask IPC handler exists, based on other tasks
  // If not, we'll need to add a specific handler in ipc-handlers.ts
  const result = await window.api.ai.runTask("advisor", {
    content,
    userNotes,
    sourceType,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data as AdvisorResult;
}
