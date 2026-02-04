/**
 * AI Task Registry (CLEANED UP)
 *
 * Central index of all AI task configurations.
 * Removed: Quiz tasks (generate-quiz, grade-answer, detect-confusion, extract-facts)
 */

// Re-export types for convenience
export * from "./types";

// Import task configs
import { identifyTestedConceptTask } from "./identify-tested-concept";
import { cardSuggestionTask } from "./card-suggestion";
import { captureAnalysisTask } from "./capture-analysis";
import { elaboratedFeedbackTask } from "./elaborated-feedback";
import { questionSummaryTask } from "./question-summary";
import { conceptExtractionTask } from "./concept-extraction";
import { cardValidationTask } from "./card-validation";
import { medicalListDetectionTask } from "./medical-list-detection";
import { vignetteConversionTask } from "./vignette-conversion";
import { tagSuggestionTask } from "./tag-suggestion";
import { cardGenerationTask } from "./card-generation";
import { flashcardAnalysisTask } from "./flashcard-analysis";
import { articleSynthesisTask } from "./article-synthesis";
import { advisorTask } from "./advisor-task";

// Export individual tasks for direct import
export { identifyTestedConceptTask };
export { cardSuggestionTask };
export { captureAnalysisTask };
export { elaboratedFeedbackTask };
export { questionSummaryTask };
export { conceptExtractionTask };
export { cardValidationTask };
export { medicalListDetectionTask };
export { vignetteConversionTask };
export { tagSuggestionTask };
export { cardGenerationTask };
export { flashcardAnalysisTask };
export { articleSynthesisTask };
export { advisorTask };

// ─────────────────────────────────────────────────────────────────────────────
// Task Registry
// ─────────────────────────────────────────────────────────────────────────────

import type { AITaskConfig } from "./types";

/**
 * Registry of all AI tasks, keyed by task ID.
 * Use this for dynamic task lookup.
 */
export const AI_TASKS: Record<string, AITaskConfig> = {
  "identify-tested-concept": identifyTestedConceptTask,
  "card-suggestion": cardSuggestionTask,
  "capture-analysis": captureAnalysisTask,
  "elaborated-feedback": elaboratedFeedbackTask,
  "question-summary": questionSummaryTask,
  "concept-extraction": conceptExtractionTask,
  "card-validation": cardValidationTask,
  "medical-list-detection": medicalListDetectionTask,
  "vignette-conversion": vignetteConversionTask,
  "tag-suggestion": tagSuggestionTask,
  "card-generation": cardGenerationTask,
  "flashcard-analysis": flashcardAnalysisTask,
  "article-synthesis": articleSynthesisTask,
  advisor: advisorTask,
} as const;

/**
 * Get a task config by ID.
 * Throws if task not found.
 */
export function getTaskById(taskId: string): AITaskConfig {
  const task = AI_TASKS[taskId];
  if (!task) {
    throw new Error(`AI task not found: ${taskId}`);
  }
  return task;
}

/**
 * Get all registered task IDs.
 */
export function getTaskIds(): string[] {
  return Object.keys(AI_TASKS);
}

/**
 * Get task metadata (id, name, description) for all tasks.
 * Useful for UI display without loading full configs.
 */
export function getTaskMetas(): Array<{
  id: string;
  name: string;
  description: string;
}> {
  return Object.values(AI_TASKS).map((task) => ({
    id: task.id,
    name: task.name,
    description: task.description,
  }));
}
