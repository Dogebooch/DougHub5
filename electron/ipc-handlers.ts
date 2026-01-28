import {
  ipcMain,
  BrowserWindow,
  app,
  Notification,
  dialog,
  shell,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
// @ts-ignore
import * as pdfParseRaw from "pdf-parse";
const pdfParse = pdfParseRaw.default ?? pdfParseRaw;
import {
  resetAIClient,
  getAvailableOllamaModels,
  extractQuestionSummary,
  // Notebook v2: Quiz System AI functions (v24)
  extractFacts,
  generateQuiz,
  gradeAnswer,
  detectConfusion,
  type ExtractFactsResult,
  type ExtractedFact,
  type GenerateQuizResult,
  type GradeAnswerResult,
  type DetectConfusionResult,
} from "./ai-service";
import {
  parseBoardQuestion,
  BoardQuestionContent,
} from "./parsers/board-question-parser";
import { downloadBoardQuestionImages } from "./services/image-service";
import {
  CapturePayload,
  isCaptureServerRunning,
  getCaptureServerPort,
} from "./capture-server";
import { notifyAIExtraction, notifyNewSourceItem } from "./ipc-utils";
import {
  cardQueries,
  noteQueries,
  reviewLogQueries,
  quickCaptureQueries,
  connectionQueries,
  sourceItemQueries,
  canonicalTopicQueries,
  notebookTopicPageQueries,
  notebookBlockQueries,
  notebookLinkQueries,
  smartViewQueries,
  searchQueries,
  settingsQueries,
  devSettingsQueries,
  getDatabase,
  getDatabaseStatus,
  getDbPath,
  initDatabase,
  closeDatabase,
  DbCard,
  DbNote,
  DbReviewLog,
  DbQuickCapture,
  DbConnection,
  DbSourceItem,
  DbCanonicalTopic,
  DbNotebookTopicPage,
  DbNotebookBlock,
  DbNotebookLink,
  DbSmartView,
  ConfidenceRating,
  WeakTopicSummary,
  TopicWithStats,
  LowEaseTopic,
  GlobalCardStats,
  ExtractionStatus,
  SourceItemStatus,
  DbStatus,
  SearchFilter,
  SearchResult,
  CardBrowserFilters,
  CardBrowserSort,
  referenceRangeQueries,
  ReferenceRange,
  // Notebook v2 (v24)
  intakeQuizQueries,
  topicQuizQueries,
  confusionPatternQueries,
  blockTopicAssignmentQueries,
  DbIntakeQuizAttempt,
  DbTopicQuizAttempt,
  DbConfusionPattern,
  DbBlockTopicAssignment,
  ActivationStatus,
  ActivationTier,
  SuspendReason,
} from "./database";
import {
  scheduleReview,
  getIntervalPreviews,
  formatInterval,
  Rating,
} from "./fsrs-service";
import {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  getBackupsDir,
  getLastBackupTimestamp,
  BackupInfo,
} from "./backup-service";
import {
  getProviderStatus,
  extractConcepts,
  analyzeCaptureContent,
  validateCard,
  detectMedicalList,
  convertToVignette,
  suggestTags,
  evaluateInsight,
  identifyTestedConcept,
  polishInsight,
  generateCardFromBlock,
  generateElaboratedFeedback,
  generateCardsFromTopic,
  findRelatedNotes,
  aiCache,
  type AIProviderStatus,
  type ConceptExtractionResult,
  type CaptureAnalysisResult,
  type ValidationResult,
  type MedicalListDetection,
  type VignetteConversion,
  type CardSuggestion,
  type ElaboratedFeedback,
  type TestedConceptResult,
  type PolishInsightResult,
  type TopicCardSuggestion,
} from "./ai-service";
import {
  resolveTopicAlias,
  createOrGetTopic,
  suggestTopicMatches,
  addTopicAlias,
  mergeTopics,
} from "./topic-service";
import {
  getClaudeDevStatus,
  captureScreenshot,
  sendMessage as sendClaudeDevMessage,
  startSession as startClaudeDevSession,
  endSession as endClaudeDevSession,
  getSessionMessages,
  clearSessionMessages,
  resetClaudeDevClient,
  type ClaudeDevMessage,
  type ClaudeDevStatus,
  type ElementInfo,
} from "./claude-dev-service";

// ============================================================================
// In-flight capture lock to prevent race conditions during async processing
// ============================================================================
const inFlightCaptures = new Map<
  string,
  Promise<{ id: string; isUpdate: boolean }>
>();

// ============================================================================
// IPC Result Wrapper
// ============================================================================

type IpcResult<T> = { data: T; error: null } | { data: null; error: string };

function success<T>(data: T): IpcResult<T> {
  return { data, error: null };
}

function failure(error: unknown): IpcResult<never> {
  const message = error instanceof Error ? error.message : String(error);
  return { data: null, error: message };
}

/**
 * Truncate title to max length with ellipsis for display.
 */
const MAX_TITLE_LENGTH = 80;
function truncateTitle(title: string): string {
  if (!title || title.length <= MAX_TITLE_LENGTH) return title;
  return title.substring(0, MAX_TITLE_LENGTH - 1) + "…";
}

/**
 * Normalizes a URL for duplicate detection.
 * Removes common tracking parameters, lowercase path, removes trailing slash.
 */
function normalizeUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ];
    trackingParams.forEach((param) => url.searchParams.delete(param));

    // For medical Q-Banks, we MUST keep query params because they often
    // contain the question ID or state. We only strip tracking params.
    // We also keep the hash if it exists, as some SPAs use it for routing.

    // Sort query params for consistent normalization
    url.searchParams.sort();

    return url.toString().toLowerCase().trim();
  } catch {
    return urlStr.toLowerCase().trim();
  }
}

/**
 * Shared capture processing logic used by both IPC and main process auto-capture
 */
export async function processCapture(
  payload: CapturePayload,
): Promise<{ id: string; isUpdate: boolean }> {
  const normalizedUrl = normalizeUrl(payload.url);

  // If this URL is already being processed, wait for it to complete
  const existingCapture = inFlightCaptures.get(normalizedUrl);
  if (existingCapture) {
    console.log(
      "[Capture] Duplicate capture in progress, waiting for completion:",
      normalizedUrl,
    );
    return existingCapture;
  }

  // Create the capture promise and store it
  const capturePromise = (async (): Promise<{
    id: string;
    isUpdate: boolean;
  }> => {
    try {
      // 1. Parse the HTML
      const content = parseBoardQuestion(
        payload.pageHTML,
        payload.siteName,
        payload.url,
        payload.timestamp,
      );

      // 2. Download images and update localPaths
      if (content.images.length > 0) {
        const downloadedImages = await downloadBoardQuestionImages(
          content.images.map((img) => ({
            url: img.url,
            location: img.location,
          })),
        );

        // Update localPaths in content
        content.images = content.images.map((img) => {
          const downloaded = downloadedImages.find(
            (d) => d.location === img.location && d.localPath,
          );
          return { ...img, localPath: downloaded?.localPath || img.localPath };
        });
      }

      // 3. Check for duplicate by Question ID or URL
      let existing: DbSourceItem | null = null;

      // Try specific question ID first if parser found one
      if (content.questionId) {
        existing = sourceItemQueries.getByQuestionId(content.questionId);
        if (existing) {
          console.log(
            `[Capture] Found existing question by questionId: ${content.questionId} (source item: ${existing.id})`,
          );
        } else {
          console.log(
            `[Capture] No existing question found for questionId: ${content.questionId}`,
          );
        }
      }

      // IMPORTANT: Do NOT fall back to URL matching for board questions
      // Board question URLs (especially PeerPrep) are often session-based and don't uniquely
      // identify questions. We rely ONLY on questionId (which includes content hashes).
      // URL fallback would cause different questions from the same session to update each other.
      //
      // For board questions: questionId is always set (either explicit ID or content hash),
      // so this path only runs if questionId somehow wasn't generated (shouldn't happen).
      if (!existing && !content.questionId) {
        existing = sourceItemQueries.getByUrl(payload.url);
        if (existing) {
          console.log(
            `[Capture] Found existing question by URL: ${payload.url} (source item: ${existing.id})`,
          );
        } else {
          console.log(`[Capture] Creating new question capture`);
        }
      } else if (!existing) {
        console.log(`[Capture] Creating new question capture`);
      }

      let resultId: string;
      let isUpdate = false;

      if (existing) {
        // Update existing: add to attempts array and refresh content
        let existingContent: BoardQuestionContent;
        try {
          existingContent = JSON.parse(
            existing.rawContent!,
          ) as BoardQuestionContent;
        } catch (error) {
          console.error(
            "[Capture] Failed to parse existing rawContent, treating as new:",
            error,
          );
          // If we can't parse existing content, treat it as a new capture
          existingContent = { ...content, attempts: [] };
        }

        const userChoice = content.answers.find((a) => a.isUserChoice);

        if (!existingContent.attempts) existingContent.attempts = [];

        existingContent.attempts.push({
          attemptNumber: existingContent.attempts.length + 1,
          date: content.capturedAt,
          chosenAnswer: userChoice?.letter || "?",
          wasCorrect: content.wasCorrect,
        });

        // Update with latest content but keep attempt history
        const mergedContent = {
          ...content,
          attempts: existingContent.attempts,
        };

        sourceItemQueries.update(existing.id, {
          rawContent: JSON.stringify(mergedContent),
          questionId: content.questionId || existing.questionId,
          updatedAt: new Date().toISOString(),
          // Update correctness to latest attempt result
          correctness: content.wasCorrect ? "correct" : "incorrect",
          // status: existing.status // Keep existing status (could be 'processed' or 'curated')
        });
        resultId = existing.id;
        isUpdate = true;

        // If existing item lacks AI metadata, extract it now (async, non-blocking)
        if (!existing.metadata) {
          notifyAIExtraction({ sourceItemId: existing.id, status: "started" });

          extractQuestionSummary(
            JSON.stringify(mergedContent),
            existing.sourceType,
          )
            .then((extracted) => {
              if (extracted) {
                sourceItemQueries.update(existing.id, {
                  metadata: {
                    ...extracted,
                    extractedAt: new Date().toISOString(),
                  },
                });
                console.log(
                  `[Capture] ✅ AI metadata extracted for existing item: "${extracted.summary}"`,
                );
                notifyAIExtraction({
                  sourceItemId: existing.id,
                  status: "completed",
                  metadata: extracted,
                });
              } else {
                notifyAIExtraction({
                  sourceItemId: existing.id,
                  status: "completed",
                });
              }
            })
            .catch((err) => {
              console.warn(
                "[Capture] ⚠️ AI extraction failed for existing item:",
                err,
              );
              notifyAIExtraction({
                sourceItemId: existing.id,
                status: "failed",
              });
            });
        }
      } else {
        // Create new SourceItem
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const sourceItem: DbSourceItem = {
          id,
          title: truncateTitle(`Board Question - ${content.category || content.source}`),
          sourceType: "qbank",
          sourceName: payload.siteName,
          sourceUrl: payload.url, // Store original URL
          questionId: content.questionId,
          rawContent: JSON.stringify(content),
          status: "inbox",
          createdAt: now,
          updatedAt: now,
          canonicalTopicIds: [],
          tags: [payload.siteName],
          // Promote wasCorrect to indexed column for filtering
          correctness: content.wasCorrect ? "correct" : "incorrect",
        };
        sourceItemQueries.insert(sourceItem);
        resultId = id;

        // Extract AI metadata for new board questions (async, non-blocking)
        // Notify renderer that extraction has started
        notifyAIExtraction({ sourceItemId: id, status: "started" });

        extractQuestionSummary(sourceItem.rawContent, sourceItem.sourceType)
          .then((extracted) => {
            if (extracted) {
              sourceItemQueries.update(id, {
                metadata: {
                  ...extracted,
                  extractedAt: new Date().toISOString(),
                },
              });
              console.log(
                `[Capture] ✅ AI metadata extracted: "${extracted.summary}"`,
              );
              // Notify renderer that extraction completed with metadata
              notifyAIExtraction({
                sourceItemId: id,
                status: "completed",
                metadata: extracted,
              });
            } else {
              // No metadata extracted (not a qbank item, etc.)
              notifyAIExtraction({ sourceItemId: id, status: "completed" });
            }
          })
          .catch((err) => {
            console.warn("[Capture] ⚠️ AI extraction failed:", err);
            notifyAIExtraction({ sourceItemId: id, status: "failed" });
          });
      }

      // 4. Persist the raw HTML for provenance/debugging
      try {
        sourceItemQueries.saveRawPage(resultId, payload.pageHTML);
      } catch (error) {
        console.error("[Capture] Failed to save raw HTML:", error);
        // Don't fail the whole capture just because raw HTML persistence failed
      }

      // 5. Show system notification
      const notification = new Notification({
        title: isUpdate ? "Question Updated" : "Question Captured",
        body: `${content.category || "Board Question"} - ${
          content.wasCorrect ? "Correct!" : "Incorrect"
        }`,
        silent: true,
      });
      notification.show();

      return { id: resultId, isUpdate };
    } finally {
      inFlightCaptures.delete(normalizedUrl);
    }
  })();

  inFlightCaptures.set(normalizedUrl, capturePromise);
  return capturePromise;
}

// ============================================================================
// Register All IPC Handlers
// ============================================================================

export function registerIpcHandlers(): void {
  // --------------------------------------------------------------------------
  // Card Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle("cards:getAll", async (): Promise<IpcResult<DbCard[]>> => {
    try {
      const cards = cardQueries.getAll();
      return success(cards);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle(
    "cards:getById",
    async (_, id: string): Promise<IpcResult<DbCard | null>> => {
      try {
        const card = cardQueries.getById(id);
        return success(card);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getDueToday",
    async (): Promise<IpcResult<DbCard[]>> => {
      try {
        const dueCards = cardQueries.getDueToday();
        return success(dueCards);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getTopicMetadata",
    async (
      _,
      pageId: string,
    ): Promise<IpcResult<{ name: string; cardCount: number } | null>> => {
      try {
        const metadata = cardQueries.getTopicMetadata(pageId);
        return success(metadata);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getWeakTopicSummaries",
    async (): Promise<IpcResult<WeakTopicSummary[]>> => {
      try {
        const summaries = cardQueries.getWeakTopicSummaries();
        return success(summaries);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getLowEaseTopics",
    async (): Promise<IpcResult<LowEaseTopic[]>> => {
      try {
        const topics = cardQueries.getLowEaseTopics();
        return success(topics);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getGlobalStats",
    async (): Promise<IpcResult<GlobalCardStats>> => {
      try {
        const stats = cardQueries.getGlobalStats();
        return success(stats);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getBrowserList",
    async (
      _event,
      filters?: CardBrowserFilters,
      sort?: CardBrowserSort,
    ): Promise<IpcResult<DbCard[]>> => {
      try {
        const items = cardQueries.getBrowserList(filters, sort);
        return success(items);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getBySiblings",
    async (_event, sourceBlockId: string): Promise<IpcResult<DbCard[]>> => {
      try {
        const siblings = cardQueries.getBySiblings(sourceBlockId);
        return success(siblings);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:create",
    async (_, card: DbCard): Promise<IpcResult<DbCard>> => {
      try {
        // v2 constraint: Cards must be linked to a notebook topic page and block
        if (!card.notebookTopicPageId || !card.sourceBlockId) {
          return failure(
            "DougHub v2 rule: Cards can only be created from Notebook Topic Page blocks. Both notebookTopicPageId and sourceBlockId must be present.",
          );
        }

        // Validation: Prevent duplicate front/back content
        const frontTrimmed = card.front?.trim();
        const backTrimmed = card.back?.trim();

        if (frontTrimmed && backTrimmed && frontTrimmed === backTrimmed) {
          return failure(
            "Card validation failed: front and back cannot be identical. For clinical vignettes, put the scenario in 'front' and the diagnosis/answer in 'back'.",
          );
        }

        // Validation: Warn about empty backs for qa cards
        if (
          (card.cardType === "qa" || card.cardType === "vignette") &&
          !backTrimmed
        ) {
          console.warn(`[IPC] Creating ${card.cardType} card with empty back`, {
            cardId: card.id,
            front: frontTrimmed?.slice(0, 100),
          });
        }

        cardQueries.insert(card);
        return success(card);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:update",
    async (
      _,
      id: string,
      updates: Partial<DbCard>,
    ): Promise<IpcResult<void>> => {
      try {
        cardQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:remove",
    async (_, id: string): Promise<IpcResult<void>> => {
      try {
        cardQueries.delete(id);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:findDuplicateFrontBack",
    async (): Promise<IpcResult<DbCard[]>> => {
      try {
        const duplicates = cardQueries.findDuplicateFrontBack();
        return success(duplicates);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Card Activation Handlers (Notebook v2)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "cards:activate",
    async (
      _,
      id: string,
      tier?: ActivationTier,
      reasons?: string[],
    ): Promise<IpcResult<DbCard | null>> => {
      try {
        cardQueries.activate(id, tier, reasons);
        const card = cardQueries.getById(id);
        return success(card);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:suspend",
    async (
      _,
      id: string,
      reason: SuspendReason,
    ): Promise<IpcResult<DbCard | null>> => {
      try {
        cardQueries.suspend(id, reason);
        const card = cardQueries.getById(id);
        return success(card);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:bulkActivate",
    async (
      _,
      ids: string[],
      tier?: ActivationTier,
      reasons?: string[],
    ): Promise<IpcResult<void>> => {
      try {
        cardQueries.bulkActivate(ids, tier, reasons);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:bulkSuspend",
    async (
      _,
      ids: string[],
      reason: SuspendReason,
    ): Promise<IpcResult<void>> => {
      try {
        cardQueries.bulkSuspend(ids, reason);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getByActivationStatus",
    async (_, status: ActivationStatus): Promise<IpcResult<DbCard[]>> => {
      try {
        const cards = cardQueries.getByActivationStatus(status);
        return success(cards);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getActiveByTopicPage",
    async (_, topicPageId: string): Promise<IpcResult<DbCard[]>> => {
      try {
        const cards = cardQueries.getActiveByTopicPage(topicPageId);
        return success(cards);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:getDormantByTopicPage",
    async (_, topicPageId: string): Promise<IpcResult<DbCard[]>> => {
      try {
        const cards = cardQueries.getDormantByTopicPage(topicPageId);
        return success(cards);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "cards:checkAndSuspendLeech",
    async (_, id: string): Promise<IpcResult<boolean>> => {
      try {
        const wasSuspended = cardQueries.checkAndSuspendLeech(id);
        return success(wasSuspended);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Intake Quiz Handlers (Notebook v2)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "intakeQuiz:saveAttempt",
    async (_, attempt: DbIntakeQuizAttempt): Promise<IpcResult<void>> => {
      try {
        intakeQuizQueries.saveAttempt(attempt);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "intakeQuiz:getBySource",
    async (
      _,
      sourceItemId: string,
    ): Promise<IpcResult<DbIntakeQuizAttempt[]>> => {
      try {
        const attempts = intakeQuizQueries.getBySource(sourceItemId);
        return success(attempts);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "intakeQuiz:getByBlock",
    async (_, blockId: string): Promise<IpcResult<DbIntakeQuizAttempt[]>> => {
      try {
        const attempts = intakeQuizQueries.getByBlock(blockId);
        return success(attempts);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Topic Entry Quiz Handlers (Notebook v2)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "topicQuiz:saveAttempt",
    async (_, attempt: DbTopicQuizAttempt): Promise<IpcResult<void>> => {
      try {
        topicQuizQueries.saveAttempt(attempt);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "topicQuiz:getRecentForTopic",
    async (
      _,
      topicPageId: string,
      limit?: number,
    ): Promise<IpcResult<DbTopicQuizAttempt[]>> => {
      try {
        const attempts = topicQuizQueries.getRecentForTopic(topicPageId, limit);
        return success(attempts);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "topicQuiz:shouldPrompt",
    async (
      _,
      topicPageId: string,
    ): Promise<IpcResult<{ shouldPrompt: boolean; daysSince: number }>> => {
      try {
        const result = topicQuizQueries.shouldPromptEntryQuiz(topicPageId);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "topicQuiz:updateLastVisited",
    async (_, topicPageId: string): Promise<IpcResult<void>> => {
      try {
        topicQuizQueries.updateLastVisited(topicPageId);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "topicQuiz:getForgottenBlockIds",
    async (
      _,
      topicPageId: string,
      sinceDate?: string,
    ): Promise<IpcResult<string[]>> => {
      try {
        const blockIds = topicQuizQueries.getForgottenBlockIds(
          topicPageId,
          sinceDate,
        );
        return success(blockIds);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Confusion Pattern Handlers (Notebook v2)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "confusionPatterns:create",
    async (_, pattern: DbConfusionPattern): Promise<IpcResult<void>> => {
      try {
        confusionPatternQueries.create(pattern);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "confusionPatterns:increment",
    async (_, id: string, newTopicId?: string): Promise<IpcResult<void>> => {
      try {
        confusionPatternQueries.increment(id, newTopicId);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "confusionPatterns:find",
    async (
      _,
      conceptA: string,
      conceptB: string,
    ): Promise<IpcResult<DbConfusionPattern | null>> => {
      try {
        const pattern = confusionPatternQueries.find(conceptA, conceptB);
        return success(pattern);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "confusionPatterns:getAll",
    async (): Promise<IpcResult<DbConfusionPattern[]>> => {
      try {
        const patterns = confusionPatternQueries.getAll();
        return success(patterns);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "confusionPatterns:getHighOccurrence",
    async (_, minCount?: number): Promise<IpcResult<DbConfusionPattern[]>> => {
      try {
        const patterns = confusionPatternQueries.getHighOccurrence(minCount);
        return success(patterns);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "confusionPatterns:setDisambiguationCard",
    async (_, patternId: string, cardId: string): Promise<IpcResult<void>> => {
      try {
        confusionPatternQueries.setDisambiguationCard(patternId, cardId);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Block Topic Assignment Handlers (Notebook v2)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "blockTopicAssignments:create",
    async (_, assignment: DbBlockTopicAssignment): Promise<IpcResult<void>> => {
      try {
        blockTopicAssignmentQueries.create(assignment);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "blockTopicAssignments:getByBlock",
    async (
      _,
      blockId: string,
    ): Promise<IpcResult<DbBlockTopicAssignment[]>> => {
      try {
        const assignments = blockTopicAssignmentQueries.getByBlock(blockId);
        return success(assignments);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "blockTopicAssignments:getByTopicPage",
    async (
      _,
      topicPageId: string,
    ): Promise<IpcResult<DbBlockTopicAssignment[]>> => {
      try {
        const assignments =
          blockTopicAssignmentQueries.getByTopicPage(topicPageId);
        return success(assignments);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "blockTopicAssignments:setPrimary",
    async (
      _,
      blockId: string,
      topicPageId: string,
    ): Promise<IpcResult<void>> => {
      try {
        blockTopicAssignmentQueries.setPrimary(blockId, topicPageId);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "blockTopicAssignments:remove",
    async (
      _,
      blockId: string,
      topicPageId: string,
    ): Promise<IpcResult<void>> => {
      try {
        blockTopicAssignmentQueries.remove(blockId, topicPageId);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "blockTopicAssignments:bulkCreate",
    async (
      _,
      assignments: DbBlockTopicAssignment[],
    ): Promise<IpcResult<void>> => {
      try {
        blockTopicAssignmentQueries.bulkCreate(assignments);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "blockTopicAssignments:getTopicPageIds",
    async (_, blockId: string): Promise<IpcResult<string[]>> => {
      try {
        const topicPageIds =
          blockTopicAssignmentQueries.getTopicPageIds(blockId);
        return success(topicPageIds);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Note Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle("notes:getAll", async (): Promise<IpcResult<DbNote[]>> => {
    try {
      const notes = noteQueries.getAll();
      return success(notes);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle(
    "notes:getById",
    async (_, id: string): Promise<IpcResult<DbNote | null>> => {
      try {
        const note = noteQueries.getById(id);
        return success(note);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notes:create",
    async (_, note: DbNote): Promise<IpcResult<DbNote>> => {
      try {
        noteQueries.insert(note);
        return success(note);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notes:update",
    async (
      _,
      id: string,
      updates: Partial<DbNote>,
    ): Promise<IpcResult<void>> => {
      try {
        noteQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notes:remove",
    async (_, id: string): Promise<IpcResult<void>> => {
      try {
        noteQueries.delete(id);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Review Log Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "reviews:log",
    async (_, log: DbReviewLog): Promise<IpcResult<DbReviewLog>> => {
      try {
        reviewLogQueries.insert(log);
        return success(log);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "reviews:getByCard",
    async (_, cardId: string): Promise<IpcResult<DbReviewLog[]>> => {
      try {
        const allLogs = reviewLogQueries.getAll();
        const cardLogs = allLogs.filter((log) => log.cardId === cardId);
        return success(cardLogs);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // FSRS Scheduling Handlers
  // --------------------------------------------------------------------------

  /**
   * Schedule a review using FSRS algorithm.
   * Updates the card and logs the review in a transaction.
   */
  ipcMain.handle(
    "reviews:schedule",
    async (
      _,
      cardId: string,
      rating: Rating,
      responseTimeMs?: number | null,
      confidenceRating?: ConfidenceRating | null,
    ): Promise<
      IpcResult<{
        card: DbCard;
        reviewLog: DbReviewLog;
        intervals: { again: number; hard: number; good: number; easy: number };
      }>
    > => {
      try {
        const result = scheduleReview(
          cardId,
          rating,
          new Date(),
          responseTimeMs,
          confidenceRating,
        );
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  /**
   * Get interval previews for a card without committing a review.
   * Returns formatted intervals for display on rating buttons.
   */
  ipcMain.handle(
    "reviews:getIntervals",
    async (
      _,
      cardId: string,
    ): Promise<
      IpcResult<{ again: string; hard: string; good: string; easy: string }>
    > => {
      try {
        const intervals = getIntervalPreviews(cardId);
        return success({
          again: formatInterval(intervals.again),
          hard: formatInterval(intervals.hard),
          good: formatInterval(intervals.good),
          easy: formatInterval(intervals.easy),
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Quick Capture Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "quickCaptures:getAll",
    async (): Promise<IpcResult<DbQuickCapture[]>> => {
      try {
        const captures = quickCaptureQueries.getAll();
        return success(captures);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "quickCaptures:getByStatus",
    async (
      _,
      status: ExtractionStatus,
    ): Promise<IpcResult<DbQuickCapture[]>> => {
      try {
        const captures = quickCaptureQueries.getByStatus(status);
        return success(captures);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "quickCaptures:create",
    async (_, capture: DbQuickCapture): Promise<IpcResult<DbQuickCapture>> => {
      try {
        quickCaptureQueries.insert(capture);
        return success(capture);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "quickCaptures:update",
    async (
      _,
      id: string,
      updates: Partial<DbQuickCapture>,
    ): Promise<IpcResult<void>> => {
      try {
        quickCaptureQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "quickCaptures:remove",
    async (_, id: string): Promise<IpcResult<void>> => {
      try {
        quickCaptureQueries.delete(id);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Connection Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "connections:getAll",
    async (): Promise<IpcResult<DbConnection[]>> => {
      try {
        const connections = connectionQueries.getAll();
        return success(connections);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "connections:getByNote",
    async (_, noteId: string): Promise<IpcResult<DbConnection[]>> => {
      try {
        // Get connections where note is either source or target
        const asSource = connectionQueries.getBySourceNote(noteId);
        const asTarget = connectionQueries.getByTargetNote(noteId);
        // Combine and dedupe by id
        const all = [...asSource, ...asTarget];
        const unique = Array.from(new Map(all.map((c) => [c.id, c])).values());
        return success(unique);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "connections:create",
    async (_, connection: DbConnection): Promise<IpcResult<DbConnection>> => {
      try {
        connectionQueries.insert(connection);
        return success(connection);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "connections:remove",
    async (_, id: string): Promise<IpcResult<void>> => {
      try {
        connectionQueries.delete(id);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Source Item Handlers (v3)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "sourceItems:getAll",
    async (): Promise<IpcResult<DbSourceItem[]>> => {
      try {
        const items = sourceItemQueries.getAll();
        return success(items);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "sourceItems:getByStatus",
    async (_, status: SourceItemStatus): Promise<IpcResult<DbSourceItem[]>> => {
      try {
        const items = sourceItemQueries.getByStatus(status);
        return success(items);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "sourceItems:getById",
    async (_, id: string): Promise<IpcResult<DbSourceItem | null>> => {
      try {
        const item = sourceItemQueries.getById(id);
        return success(item);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "sourceItems:create",
    async (_, item: DbSourceItem): Promise<IpcResult<DbSourceItem>> => {
      try {
        // Truncate long titles to prevent display issues
        if (item.title) {
          item.title = truncateTitle(item.title);
        }

        // Extract metadata for qbank questions
        if (item.sourceType === "qbank" && !item.metadata) {
          console.log(
            `[IPC] Extracting metadata for QBank question: ${item.title.substring(
              0,
              50,
            )}...`,
          );
          try {
            const extracted = await extractQuestionSummary(
              item.rawContent,
              item.sourceType,
            );
            if (extracted) {
              item.metadata = {
                ...extracted,
                extractedAt: new Date().toISOString(),
              };
              console.log(
                `[IPC] ✅ Metadata extracted: "${extracted.summary}"`,
              );
            } else {
              console.log(
                "[IPC] ⚠️  No metadata extracted - will use fallback display",
              );
            }
          } catch (extractError) {
            // Extraction failed - continue without metadata
            console.warn(
              "[IPC] ❌ Failed to extract question summary:",
              extractError,
            );
          }
        }

        sourceItemQueries.insert(item);
        console.log(`[IPC] ✅ SourceItem saved: ${item.id}`);
        // Notify renderer to refresh inbox list
        notifyNewSourceItem(item);
        return success(item);
      } catch (error) {
        console.error("[IPC] ❌ Failed to create SourceItem:", error);
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "sourceItems:update",
    async (
      _,
      id: string,
      updates: Partial<DbSourceItem>,
    ): Promise<IpcResult<void>> => {
      try {
        sourceItemQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "sourceItems:delete",
    async (_, id: string): Promise<IpcResult<void>> => {
      try {
        sourceItemQueries.delete(id);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "sourceItems:getRawPage",
    async (_, sourceItemId: string): Promise<IpcResult<string | null>> => {
      try {
        const html = sourceItemQueries.getRawPage(sourceItemId);
        return success(html);
      } catch (error) {
        return failure(error);
      }
    },
  );

  /**
   * Re-parse a board question from its stored raw HTML.
   * This allows updating parsed content when parser logic changes without re-capturing.
   * Preserves: attempt history, images (localPaths), metadata
   * Updates: vignette, question stem, answers, explanation, key points, etc.
   */
  ipcMain.handle(
    "sourceItems:reparseFromRaw",
    async (
      _,
      sourceItemId: string,
    ): Promise<
      IpcResult<{ success: boolean; message: string; updated?: boolean }>
    > => {
      try {
        // 1. Get the source item
        const item = sourceItemQueries.getById(sourceItemId);
        if (!item) {
          return success({
            success: false,
            message: `Source item not found: ${sourceItemId}`,
          });
        }

        // 2. Get the stored raw HTML
        const rawHtml = sourceItemQueries.getRawPage(sourceItemId);
        if (!rawHtml) {
          return success({
            success: false,
            message: "No raw HTML stored for this item. Re-capture required.",
          });
        }

        // 3. Determine site type from sourceName
        let siteName: "ACEP PeerPrep" | "MKSAP 19";
        if (
          item.sourceName?.toLowerCase().includes("mksap") ||
          item.sourceUrl?.includes("mksap")
        ) {
          siteName = "MKSAP 19";
        } else if (
          item.sourceName?.toLowerCase().includes("peerprep") ||
          item.sourceUrl?.includes("peerprep")
        ) {
          siteName = "ACEP PeerPrep";
        } else {
          return success({
            success: false,
            message: `Unknown source type: ${item.sourceName}`,
          });
        }

        // 4. Parse existing content to preserve attempt history
        let existingContent: BoardQuestionContent | null = null;
        try {
          if (item.rawContent) {
            existingContent = JSON.parse(
              item.rawContent,
            ) as BoardQuestionContent;
          }
        } catch (e) {
          console.warn("[Reparse] Could not parse existing rawContent:", e);
        }

        // 5. Re-parse the HTML
        const newContent = parseBoardQuestion(
          rawHtml,
          siteName,
          item.sourceUrl || "",
          item.createdAt,
        );

        // 6. Preserve important data from existing content
        if (existingContent) {
          // Preserve attempt history
          newContent.attempts = existingContent.attempts || [];

          // Preserve image localPaths (don't re-download)
          if (existingContent.images && existingContent.images.length > 0) {
            newContent.images = newContent.images.map((newImg) => {
              // Try to find matching existing image by URL
              const existingImg = existingContent!.images.find(
                (e) => e.url === newImg.url,
              );
              if (existingImg?.localPath) {
                return { ...newImg, localPath: existingImg.localPath };
              }
              return newImg;
            });
          }
        }

        // 7. Update the source item
        sourceItemQueries.update(sourceItemId, {
          rawContent: JSON.stringify(newContent),
          questionId: newContent.questionId || item.questionId,
          updatedAt: new Date().toISOString(),
        });

        console.log(
          `[Reparse] Successfully re-parsed source item ${sourceItemId} (${siteName})`,
        );
        return success({
          success: true,
          message: `Re-parsed successfully from stored HTML`,
          updated: true,
        });
      } catch (error) {
        console.error("[Reparse] Error:", error);
        return failure(error);
      }
    },
  );

  /**
   * Bulk re-parse all board questions from stored raw HTML.
   * Useful when parser logic changes.
   */
  ipcMain.handle(
    "sourceItems:reparseAllFromRaw",
    async (
      event,
      options?: { siteName?: "MKSAP 19" | "ACEP PeerPrep" },
    ): Promise<
      IpcResult<{
        processed: number;
        succeeded: number;
        failed: number;
        skipped: number;
      }>
    > => {
      try {
        const sender = event.sender;
        const items = sourceItemQueries.getByType("qbank");

        let processed = 0;
        let succeeded = 0;
        let failed = 0;
        let skipped = 0;

        for (const item of items) {
          processed++;

          // Filter by site if specified
          if (options?.siteName) {
            const isMksap =
              item.sourceName?.toLowerCase().includes("mksap") ||
              item.sourceUrl?.includes("mksap");
            const isPeerprep =
              item.sourceName?.toLowerCase().includes("peerprep") ||
              item.sourceUrl?.includes("peerprep");

            if (options.siteName === "MKSAP 19" && !isMksap) {
              skipped++;
              continue;
            }
            if (options.siteName === "ACEP PeerPrep" && !isPeerprep) {
              skipped++;
              continue;
            }
          }

          // Check if raw HTML exists
          const rawHtml = sourceItemQueries.getRawPage(item.id);
          if (!rawHtml) {
            skipped++;
            continue;
          }

          try {
            // Determine site type
            let siteName: "ACEP PeerPrep" | "MKSAP 19";
            if (
              item.sourceName?.toLowerCase().includes("mksap") ||
              item.sourceUrl?.includes("mksap")
            ) {
              siteName = "MKSAP 19";
            } else {
              siteName = "ACEP PeerPrep";
            }

            // Parse existing content
            let existingContent: BoardQuestionContent | null = null;
            try {
              if (item.rawContent) {
                existingContent = JSON.parse(
                  item.rawContent,
                ) as BoardQuestionContent;
              }
            } catch (e) {
              // ignore parse errors
            }

            // Re-parse
            const newContent = parseBoardQuestion(
              rawHtml,
              siteName,
              item.sourceUrl || "",
              item.createdAt,
            );

            // Preserve data
            if (existingContent) {
              newContent.attempts = existingContent.attempts || [];
              if (existingContent.images?.length > 0) {
                newContent.images = newContent.images.map((newImg) => {
                  const existingImg = existingContent!.images.find(
                    (e) => e.url === newImg.url,
                  );
                  return existingImg?.localPath
                    ? { ...newImg, localPath: existingImg.localPath }
                    : newImg;
                });
              }
            }

            // Update
            sourceItemQueries.update(item.id, {
              rawContent: JSON.stringify(newContent),
              questionId: newContent.questionId || item.questionId,
              updatedAt: new Date().toISOString(),
            });

            succeeded++;
          } catch (e) {
            console.error(`[Reparse] Failed for ${item.id}:`, e);
            failed++;
          }

          // Send progress
          sender.send("sourceItems:reparseFromRaw:progress", {
            current: processed,
            total: items.length,
            succeeded,
            failed,
            skipped,
          });
        }

        return success({ processed, succeeded, failed, skipped });
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "sourceItems:purgeRawPages",
    async (): Promise<IpcResult<void>> => {
      try {
        sourceItemQueries.purgeRawPages();
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // Track cancellation state for long-running operations
  let reextractCancelled = false;
  let reextractBackupFile: string | null = null;

  /**
   * Cancel an in-progress metadata re-extraction and restore backup
   */
  ipcMain.handle(
    "sourceItems:cancelReextract",
    async (): Promise<IpcResult<void>> => {
      reextractCancelled = true;
      console.log("[IPC] Metadata re-extraction cancellation requested");
      return success(undefined);
    },
  );

  /**
   * Bulk re-extract AI metadata for qbank items from stored rawContent.
   * Useful after AI prompt changes or for items captured before AI extraction was added.
   * @param options.ids - Optional array of specific source item IDs to process. If omitted, processes all qbank items.
   * @param options.overwrite - If true, re-extracts even if metadata exists. Default false (only missing).
   */
  ipcMain.handle(
    "sourceItems:reextractMetadata",
    async (
      event,
      options?: {
        ids?: string[];
        overwrite?: boolean;
        sourceTypes?: ("qbank" | "quickcapture" | "article" | "pdf" | "all")[];
      },
    ): Promise<
      IpcResult<{
        processed: number;
        succeeded: number;
        failed: number;
        cancelled?: boolean;
        restored?: boolean;
      }>
    > => {
      // Reset cancellation state
      reextractCancelled = false;
      reextractBackupFile = null;

      try {
        const {
          ids,
          overwrite = false,
          sourceTypes = ["qbank"],
        } = options || {};
        const sender = event.sender;

        // Helper to send progress updates
        const sendProgress = (data: {
          current: number;
          total: number;
          succeeded: number;
          failed: number;
          currentItem?: string;
          status?: "running" | "cancelled" | "restoring" | "complete";
        }) => {
          sender.send("sourceItems:reextractMetadata:progress", data);
        };

        // Get items to process
        let items: DbSourceItem[];
        if (ids && ids.length > 0) {
          items = ids
            .map((id) => sourceItemQueries.getById(id))
            .filter((item): item is DbSourceItem => item !== null);
        } else if (sourceTypes.includes("all")) {
          // Get all source items
          items = sourceItemQueries.getAll();
        } else {
          // Get items for specific source types
          items = sourceTypes.flatMap((type) =>
            sourceItemQueries.getByType(type as any),
          );
        }

        // Filter to only those needing extraction (unless overwrite)
        if (!overwrite) {
          items = items.filter((item) => !item.metadata);
        }

        // Early exit if nothing to process
        if (items.length === 0) {
          return success({ processed: 0, succeeded: 0, failed: 0 });
        }

        // Create backup before starting (for overwrite mode or any modification)
        const dbPath = getDbPath();
        if (dbPath) {
          console.log("[IPC] Creating backup before metadata re-extraction...");
          const backupPath = createBackup(dbPath);
          reextractBackupFile = path.basename(backupPath);
          console.log(`[IPC] Backup created: ${reextractBackupFile}`);
        }

        console.log(
          `[IPC] Starting bulk metadata extraction for ${items.length} items (overwrite=${overwrite})`,
        );

        // Send initial progress
        sendProgress({
          current: 0,
          total: items.length,
          succeeded: 0,
          failed: 0,
          status: "running",
        });

        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < items.length; i++) {
          // Check for cancellation
          if (reextractCancelled) {
            console.log(
              `[IPC] Re-extraction cancelled at ${i}/${items.length}`,
            );
            sendProgress({
              current: i,
              total: items.length,
              succeeded,
              failed,
              status: "restoring",
            });

            // Restore from backup
            if (reextractBackupFile && dbPath) {
              console.log(`[IPC] Restoring backup: ${reextractBackupFile}`);
              const backupPath = path.join(
                getBackupsDir(),
                reextractBackupFile,
              );
              restoreBackup(backupPath, dbPath);
              console.log("[IPC] Backup restored successfully");
            }

            return success({
              processed: i,
              succeeded,
              failed,
              cancelled: true,
              restored: !!reextractBackupFile,
            });
          }

          const item = items[i];
          try {
            const extracted = await extractQuestionSummary(
              item.rawContent,
              item.sourceType,
            );
            if (extracted) {
              sourceItemQueries.update(item.id, {
                metadata: {
                  ...extracted,
                  extractedAt: new Date().toISOString(),
                },
              });
              succeeded++;
              console.log(
                `[IPC] ✅ [${i + 1}/${items.length}] Extracted: "${
                  extracted.summary
                }"`,
              );
            } else {
              failed++;
              console.log(
                `[IPC] ⚠️ [${i + 1}/${items.length}] No extraction result for ${
                  item.id
                }`,
              );
            }
          } catch (err) {
            failed++;
            console.warn(
              `[IPC] ❌ [${i + 1}/${items.length}] Failed for ${item.id}:`,
              err,
            );
          }

          // Send progress update after each item
          sendProgress({
            current: i + 1,
            total: items.length,
            succeeded,
            failed,
            currentItem: item.title,
            status: "running",
          });
        }

        console.log(
          `[IPC] Bulk extraction complete: ${succeeded} succeeded, ${failed} failed`,
        );
        sendProgress({
          current: items.length,
          total: items.length,
          succeeded,
          failed,
          status: "complete",
        });
        return success({ processed: items.length, succeeded, failed });
      } catch (error) {
        return failure(error);
      }
    },
  );

  /**
   * Capture: Process a board question payload from the browser extension
   */
  ipcMain.handle(
    "capture:process",
    async (
      _,
      payload: CapturePayload,
    ): Promise<IpcResult<{ id: string; isUpdate: boolean }>> => {
      try {
        const result = await processCapture(payload);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // ===== CAPTURE SERVER STATUS =====
  ipcMain.handle("capture:getStatus", () => {
    try {
      return {
        data: {
          isRunning: isCaptureServerRunning(),
          port: getCaptureServerPort(),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: String(error) };
    }
  });

  // --------------------------------------------------------------------------
  // Canonical Topic Handlers (v3)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "canonicalTopics:getAll",
    async (): Promise<IpcResult<DbCanonicalTopic[]>> => {
      try {
        const topics = canonicalTopicQueries.getAll();
        return success(topics);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "canonicalTopics:getById",
    async (_, id: string): Promise<IpcResult<DbCanonicalTopic | null>> => {
      try {
        const topic = canonicalTopicQueries.getById(id);
        return success(topic);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "canonicalTopics:getByDomain",
    async (_, domain: string): Promise<IpcResult<DbCanonicalTopic[]>> => {
      try {
        const topics = canonicalTopicQueries.getByDomain(domain);
        return success(topics);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "canonicalTopics:resolveAlias",
    async (_, name: string): Promise<IpcResult<DbCanonicalTopic | null>> => {
      try {
        const topic = resolveTopicAlias(name);
        return success(topic);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "canonicalTopics:createOrGet",
    async (
      _,
      name: string,
      domain?: string,
    ): Promise<IpcResult<DbCanonicalTopic>> => {
      try {
        const topic = createOrGetTopic(name, domain);
        return success(topic);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "canonicalTopics:addAlias",
    async (_, topicId: string, alias: string): Promise<IpcResult<void>> => {
      try {
        addTopicAlias(topicId, alias);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "canonicalTopics:suggestMatches",
    async (_, input: string): Promise<IpcResult<DbCanonicalTopic[]>> => {
      try {
        const matches = suggestTopicMatches(input);
        return success(matches);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "canonicalTopics:merge",
    async (_, sourceId: string, targetId: string): Promise<IpcResult<void>> => {
      try {
        mergeTopics(sourceId, targetId);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Notebook Topic Page Handlers (v3)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "notebookPages:getAll",
    async (): Promise<IpcResult<DbNotebookTopicPage[]>> => {
      try {
        const pages = notebookTopicPageQueries.getAll();
        return success(pages);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookPages:getById",
    async (_, id: string): Promise<IpcResult<DbNotebookTopicPage | null>> => {
      try {
        const page = notebookTopicPageQueries.getById(id);
        return success(page);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookPages:getByTopic",
    async (
      _,
      canonicalTopicId: string,
    ): Promise<IpcResult<DbNotebookTopicPage | null>> => {
      try {
        const page =
          notebookTopicPageQueries.getByCanonicalTopicId(canonicalTopicId);
        return success(page);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookPages:create",
    async (
      _,
      page: DbNotebookTopicPage,
    ): Promise<IpcResult<DbNotebookTopicPage>> => {
      try {
        notebookTopicPageQueries.insert(page);
        return success(page);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookPages:update",
    async (
      _,
      id: string,
      updates: Partial<DbNotebookTopicPage>,
    ): Promise<IpcResult<void>> => {
      try {
        notebookTopicPageQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookPages:delete",
    async (_, id: string): Promise<IpcResult<void>> => {
      try {
        notebookTopicPageQueries.delete(id);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebook:getTopicsWithStats",
    async (): Promise<IpcResult<TopicWithStats[]>> => {
      try {
        const topics = notebookTopicPageQueries.getTopicsWithStats();
        return success(topics);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Notebook Block Handlers (v3)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "notebookBlocks:getByPage",
    async (
      _,
      pageId: string,
      options?: { highYieldOnly?: boolean },
    ): Promise<IpcResult<DbNotebookBlock[]>> => {
      try {
        const blocks = notebookBlockQueries.getByPage(pageId, options);
        return success(blocks);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookBlocks:getById",
    async (_, id: string): Promise<IpcResult<DbNotebookBlock | null>> => {
      try {
        const block = notebookBlockQueries.getById(id);
        return success(block);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookBlocks:getBySourceId",
    async (_, sourceId: string): Promise<IpcResult<DbNotebookBlock | null>> => {
      try {
        const block = notebookBlockQueries.getBySourceId(sourceId);
        return success(block);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookBlocks:create",
    async (_, block: DbNotebookBlock): Promise<IpcResult<DbNotebookBlock>> => {
      try {
        notebookBlockQueries.insert(block);
        return success(block);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookBlocks:update",
    async (
      _,
      id: string,
      updates: Partial<DbNotebookBlock>,
    ): Promise<IpcResult<void>> => {
      try {
        notebookBlockQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookBlocks:toggleHighYield",
    async (_, blockId: string): Promise<IpcResult<DbNotebookBlock>> => {
      try {
        // Fetch current block
        const current = notebookBlockQueries.getById(blockId);
        if (!current) {
          throw new Error(`NotebookBlock not found: ${blockId}`);
        }

        // Toggle isHighYield
        const toggled = { ...current, isHighYield: !current.isHighYield };
        notebookBlockQueries.update(blockId, {
          isHighYield: toggled.isHighYield,
        });

        // Return updated block for optimistic UI sync
        return success(toggled);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookBlocks:delete",
    async (_, id: string): Promise<IpcResult<void>> => {
      try {
        notebookBlockQueries.delete(id);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookBlocks:searchByContent",
    async (
      _,
      {
        query,
        excludeBlockId,
        limit,
      }: {
        query: string;
        excludeBlockId?: string;
        limit?: number;
      },
    ): Promise<
      IpcResult<
        { block: DbNotebookBlock; topicName: string; excerpt: string }[]
      >
    > => {
      try {
        const results = notebookBlockQueries.searchByContent(
          query,
          excludeBlockId,
          limit,
        );
        return success(results);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookBlocks:getBySource",
    async (
      _,
      sourceId: string,
    ): Promise<
      IpcResult<{ block: DbNotebookBlock; topicName: string; pageId: string }[]>
    > => {
      try {
        const blocks = notebookBlockQueries.getBySourceDetailed(sourceId);
        return success(blocks);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookBlocks:addToAnotherTopic",
    async (
      _,
      {
        sourceItemId,
        topicId,
        insight,
        linkToBlockId,
      }: {
        sourceItemId: string;
        topicId: string;
        insight: string;
        linkToBlockId?: string;
      },
    ): Promise<IpcResult<DbNotebookBlock>> => {
      try {
        const db = getDatabase();
        let resultBlock: DbNotebookBlock | null = null;

        db.transaction(() => {
          // 1. Check if block already exists for this source+topic combo
          const existingPage = notebookTopicPageQueries
            .getAll()
            .find((p) => p.canonicalTopicId === topicId);
          if (existingPage) {
            const existingBlocks = notebookBlockQueries.getByPage(
              existingPage.id,
            );
            if (existingBlocks.some((b) => b.sourceItemId === sourceItemId)) {
              throw new Error("This source is already added to that topic.");
            }
          }

          // 2. Get or create NotebookTopicPage
          let page = existingPage;
          if (!page) {
            page = {
              id: crypto.randomUUID(),
              canonicalTopicId: topicId,
              cardIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            notebookTopicPageQueries.insert(page);
          }

          // 3. Get next position
          const blocks = notebookBlockQueries.getByPage(page.id);
          const nextPosition = blocks.length;

          // 4. Create new NotebookBlock
          const newBlock: DbNotebookBlock = {
            id: crypto.randomUUID(),
            notebookTopicPageId: page.id,
            sourceItemId,
            content: insight,
            position: nextPosition,
            cardCount: 0,
            userInsight: insight,
            relevanceScore: "high",
            isHighYield: false, // Default to not high-yield
          };
          notebookBlockQueries.insert(newBlock);

          // 5. If linkToBlockId provided, create notebook_link
          if (linkToBlockId) {
            notebookLinkQueries.create({
              sourceBlockId: linkToBlockId,
              targetBlockId: newBlock.id,
              linkType: "cross_specialty",
              reason: "Same source, different topic perspective",
            });
          }

          // 6. If source status is 'inbox', update to 'processed'
          const source = sourceItemQueries.getById(sourceItemId);
          if (source && (source.status as string) === "inbox") {
            sourceItemQueries.update(sourceItemId, {
              status: "processed" as SourceItemStatus,
              processedAt: new Date().toISOString(),
            });
          }

          resultBlock = newBlock;
        })();

        if (!resultBlock) {
          throw new Error("Failed to create block in transaction.");
        }

        return success(resultBlock);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Notebook Link Handlers (v3)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "notebookLinks:create",
    async (
      _,
      link: Omit<DbNotebookLink, "id" | "createdAt">,
    ): Promise<IpcResult<DbNotebookLink>> => {
      try {
        const result = notebookLinkQueries.create(link);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookLinks:getBySourceBlock",
    async (_, blockId: string): Promise<IpcResult<DbNotebookLink[]>> => {
      try {
        const result = notebookLinkQueries.getBySourceBlock(blockId);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookLinks:getByTargetBlock",
    async (_, blockId: string): Promise<IpcResult<DbNotebookLink[]>> => {
      try {
        const result = notebookLinkQueries.getByTargetBlock(blockId);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "notebookLinks:delete",
    async (_, id: string): Promise<IpcResult<boolean>> => {
      try {
        const result = notebookLinkQueries.delete(id);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Smart View Handlers (v3)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "smartViews:getAll",
    async (): Promise<IpcResult<DbSmartView[]>> => {
      try {
        const views = smartViewQueries.getAll();
        return success(views);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "smartViews:getSystem",
    async (): Promise<IpcResult<DbSmartView[]>> => {
      try {
        const views = smartViewQueries.getSystemViews();
        return success(views);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Search Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "search:query",
    async (
      _,
      query: string,
      filter?: SearchFilter,
    ): Promise<IpcResult<SearchResult>> => {
      try {
        const result = searchQueries.search(query, filter || "all");
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Backup Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle("backup:list", async (): Promise<IpcResult<BackupInfo[]>> => {
    try {
      const backups = listBackups();
      return success(backups);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle(
    "backup:getLastTimestamp",
    async (): Promise<IpcResult<string | null>> => {
      try {
        const timestamp = getLastBackupTimestamp();
        return success(timestamp);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle("backup:create", async (): Promise<IpcResult<string>> => {
    try {
      const dbPath = getDbPath();
      if (!dbPath) {
        throw new Error("Database not initialized");
      }
      const backupPath = createBackup(dbPath);
      // Return just the filename for cleaner API
      return success(path.basename(backupPath));
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle(
    "backup:selectFile",
    async (): Promise<IpcResult<string | null>> => {
      try {
        const result = await dialog.showOpenDialog({
          title: "Select Backup to Restore",
          filters: [{ name: "DougHub Database", extensions: ["db"] }],
          properties: ["openFile"],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return success(null);
        }

        return success(result.filePaths[0]);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "backup:restore",
    async (_, filePath: string): Promise<IpcResult<void>> => {
      try {
        const dbPath = getDbPath();
        if (!dbPath) {
          throw new Error("Database not initialized");
        }

        // Determine if it's a filename or absolute path
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.join(getBackupsDir(), filePath);

        if (!fs.existsSync(absolutePath)) {
          throw new Error(`Backup file not found: ${absolutePath}`);
        }

        console.log(`[Backup] Starting restore from: ${absolutePath}`);

        // 1. Close DB connection safely
        closeDatabase();

        // 2. Perform restoration (copying files)
        restoreBackup(absolutePath, dbPath);

        // 3. Re-initialize connection
        initDatabase(dbPath);

        console.log(`[Backup] Restore complete. DB re-initialized.`);
        return success(undefined);
      } catch (error) {
        console.error(`[Backup] Restore failed:`, error);
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "backup:cleanup",
    async (_, retentionDays?: number): Promise<IpcResult<number>> => {
      try {
        const deleted = cleanupOldBackups(retentionDays);
        return success(deleted);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Database Status Handler
  // --------------------------------------------------------------------------

  ipcMain.handle("db:status", async (): Promise<IpcResult<DbStatus>> => {
    try {
      const status = getDatabaseStatus();
      return success(status);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle("db:getPath", async (): Promise<IpcResult<string | null>> => {
    try {
      return success(getDbPath());
    } catch (error) {
      return failure(error);
    }
  });

  // --------------------------------------------------------------------------
  // AI Service Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "ai:getProviderStatus",
    async (): Promise<IpcResult<AIProviderStatus>> => {
      try {
        const status = await getProviderStatus();
        return success(status);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:extractConcepts",
    async (_, content: string): Promise<IpcResult<ConceptExtractionResult>> => {
      try {
        // Check cache first
        const cacheKey = aiCache.key("extractConcepts", content);
        const cached = aiCache.get<ConceptExtractionResult>(cacheKey);
        if (cached) {
          return success(cached);
        }

        const result = await extractConcepts(content);
        aiCache.set(cacheKey, result);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:analyzeCaptureContent",
    async (
      _,
      content: string,
    ): Promise<IpcResult<CaptureAnalysisResult | null>> => {
      try {
        const result = await analyzeCaptureContent(content);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:validateCard",
    async (
      _,
      front: string,
      back: string,
      cardType: "qa" | "cloze",
    ): Promise<IpcResult<ValidationResult>> => {
      try {
        const cacheKey = aiCache.key("validateCard", front, back, cardType);
        const cached = aiCache.get<ValidationResult>(cacheKey);
        if (cached) {
          return success(cached);
        }

        const result = await validateCard(front, back, cardType);
        aiCache.set(cacheKey, result);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:detectMedicalList",
    async (_, content: string): Promise<IpcResult<MedicalListDetection>> => {
      try {
        const cacheKey = aiCache.key("detectMedicalList", content);
        const cached = aiCache.get<MedicalListDetection>(cacheKey);
        if (cached) {
          return success(cached);
        }

        const result = await detectMedicalList(content);
        aiCache.set(cacheKey, result);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:convertToVignette",
    async (
      _,
      listItem: string,
      context: string,
    ): Promise<IpcResult<VignetteConversion>> => {
      try {
        const cacheKey = aiCache.key("convertToVignette", listItem, context);
        const cached = aiCache.get<VignetteConversion>(cacheKey);
        if (cached) {
          console.log("[IPC] ai:convertToVignette cache hit");
          return success(cached);
        }

        const result = await convertToVignette(listItem, context);
        aiCache.set(cacheKey, result);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:evaluateInsight",
    async (
      _,
      input: {
        userInsight: string;
        sourceContent: string;
        isIncorrect: boolean;
        topicContext?: string;
        blockId?: string;
      },
    ): Promise<IpcResult<NotebookBlockAiEvaluation>> => {
      try {
        const result = await evaluateInsight(input);

        // Optional persistence if blockId is provided
        if (input.blockId) {
          notebookBlockQueries.update(input.blockId, {
            userInsight: input.userInsight,
            aiEvaluation: result,
          });
        }

        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // T138: Add to Notebook AI Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle(
    "ai:identifyTestedConcept",
    async (
      _,
      sourceContent: string,
      sourceType: string,
    ): Promise<IpcResult<TestedConceptResult>> => {
      try {
        const result = await identifyTestedConcept(sourceContent, sourceType);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:polishInsight",
    async (
      _,
      userText: string,
      sourceContent: string,
      testedConcept?: string,
    ): Promise<IpcResult<PolishInsightResult>> => {
      try {
        const result = await polishInsight(
          userText,
          sourceContent,
          testedConcept,
        );
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "insights:getBoardRelevance",
    async (
      _,
      topicTags: string[],
    ): Promise<
      IpcResult<{
        questionsAttempted: number;
        correctCount: number;
        accuracy: number;
        testedConcepts: { concept: string; count: number }[];
        missedConcepts: { concept: string; sourceItemId: string }[];
      }>
    > => {
      try {
        const result = getBoardRelevanceForTopic(topicTags);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "insights:getExamTrapBreakdown",
    async (): Promise<IpcResult<{ trapType: string; count: number }[]>> => {
      try {
        const result = notebookBlockQueries.getExamTrapBreakdown();
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "insights:getConfusionPairs",
    async (): Promise<IpcResult<{ tag: string; count: number }[]>> => {
      try {
        const result = notebookBlockQueries.getConfusionPairsAggregated();
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:generateCards",
    async (
      _,
      blockContent: string,
      topicContext: string,
      userIntent?: string,
    ): Promise<IpcResult<CardSuggestion[]>> => {
      try {
        const cards = await generateCardFromBlock(
          blockContent,
          topicContext,
          userIntent,
        );
        return success(cards);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:generateCardsFromTopic",
    async (
      _,
      topicName: string,
      blocks: Array<{
        id: string;
        content: string;
        userInsight?: string;
        calloutType?: "pearl" | "trap" | "caution" | null;
        isHighYield?: boolean; // v22: High-yield marker for prioritization
      }>,
    ): Promise<IpcResult<TopicCardSuggestion[]>> => {
      try {
        const suggestions = await generateCardsFromTopic(topicName, blocks);
        return success(suggestions);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:generateElaboratedFeedback",
    async (
      _,
      card: { front: string; back: string; cardType: string },
      topicContext: string,
      responseTimeMs: number | null,
    ): Promise<IpcResult<ElaboratedFeedback>> => {
      try {
        const result = await generateElaboratedFeedback(
          card,
          topicContext,
          responseTimeMs,
        );
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:suggestTags",
    async (_, content: string): Promise<IpcResult<string[]>> => {
      try {
        const cacheKey = aiCache.key("suggestTags", content);
        const cached = aiCache.get<string[]>(cacheKey);
        if (cached) {
          console.log("[IPC] ai:suggestTags cache hit");
          return success(cached);
        }

        const tags = await suggestTags(content);
        aiCache.set(cacheKey, tags);
        return success(tags);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:findRelatedNotes",
    async (
      _,
      content: string,
      minSimilarity?: number,
      maxResults?: number,
    ): Promise<IpcResult<Array<{ noteId: string; similarity: number }>>> => {
      try {
        // Get all notes for comparison
        const notes = noteQueries.getAll();
        const matches = findRelatedNotes(
          content,
          notes,
          minSimilarity,
          maxResults,
        );
        return success(matches);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle("ai:clearCache", async (): Promise<IpcResult<void>> => {
    try {
      aiCache.clear();
      console.log("[IPC] AI cache cleared");
      return success(undefined);
    } catch (error) {
      return failure(error);
    }
  });

  // --------------------------------------------------------------------------
  // Notebook v2: Quiz System AI Handlers (v24)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "ai:extractFacts",
    async (
      _,
      sourceContent: string,
      sourceType: string,
      topicContext?: string,
    ): Promise<IpcResult<ExtractFactsResult>> => {
      try {
        const cacheKey = aiCache.key(
          "extractFacts",
          sourceContent,
          sourceType,
          topicContext || "",
        );
        const cached = aiCache.get<ExtractFactsResult>(cacheKey);
        if (cached) {
          console.log("[IPC] ai:extractFacts cache hit");
          return success(cached);
        }

        const result = await extractFacts(
          sourceContent,
          sourceType,
          topicContext,
        );
        aiCache.set(cacheKey, result, 600000); // 10 min cache
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:generateQuiz",
    async (
      _,
      facts: ExtractedFact[],
      topicContext: string,
      maxQuestions?: number,
    ): Promise<IpcResult<GenerateQuizResult>> => {
      try {
        const result = await generateQuiz(facts, topicContext, maxQuestions);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:gradeAnswer",
    async (
      _,
      userAnswer: string,
      correctAnswer: string,
      acceptableAnswers: string[],
      questionContext: string,
    ): Promise<IpcResult<GradeAnswerResult>> => {
      try {
        const result = await gradeAnswer(
          userAnswer,
          correctAnswer,
          acceptableAnswers,
          questionContext,
        );
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "ai:detectConfusion",
    async (
      _,
      userAnswer: string,
      correctAnswer: string,
      topicContext: string,
      relatedConcepts?: string[],
    ): Promise<IpcResult<DetectConfusionResult>> => {
      try {
        const result = await detectConfusion(
          userAnswer,
          correctAnswer,
          topicContext,
          relatedConcepts,
        );
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Settings Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "settings:get",
    async (_, key: string): Promise<IpcResult<string | null>> => {
      try {
        const value = settingsQueries.get(key);
        return success(value);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "settings:set",
    async (_, key: string, value: string): Promise<IpcResult<void>> => {
      try {
        settingsQueries.set(key, value);

        // Reset AI client if AI-specific settings change
        if (
          key === "aiProvider" ||
          key === "openaiApiKey" ||
          key === "anthropicApiKey" ||
          key === "openaiModel" ||
          key === "anthropicModel" ||
          key === "ollamaModel"
        ) {
          resetAIClient();
        }

        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "settings:getParsed",
    async (
      _,
      key: string,
      defaultValue: unknown,
    ): Promise<IpcResult<unknown>> => {
      try {
        const value = settingsQueries.getParsed(key, defaultValue);
        return success(value);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "settings:getAll",
    async (): Promise<IpcResult<{ key: string; value: string }[]>> => {
      try {
        return success(settingsQueries.getAll());
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // AI Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "ai:getOllamaModels",
    async (): Promise<IpcResult<string[]>> => {
      try {
        const models = await getAvailableOllamaModels();
        return success(models);
      } catch (error) {
        return failure(error);
      }
    },
  );

  // --------------------------------------------------------------------------
  // File Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "files:saveImage",
    async (
      _,
      { data, mimeType }: { data: string; mimeType: string },
    ): Promise<IpcResult<{ path: string }>> => {
      try {
        const mimeMap: Record<string, string> = {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/gif": "gif",
          "image/webp": "webp",
        };

        const ext = mimeMap[mimeType] || "png";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const userDataPath = app.getPath("userData");
        const imagesDir = path.join(userDataPath, "images");

        // Ensure directory exists
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }

        // Extract base64 content from data URL
        const base64Data = data.split(",")[1];
        if (!base64Data) {
          throw new Error("Invalid base64 data");
        }

        const buffer = Buffer.from(base64Data, "base64");
        const filePath = path.join(imagesDir, fileName);
        const relativePath = path.join("images", fileName).replace(/\\/g, "/");

        fs.writeFileSync(filePath, buffer);

        return success({ path: relativePath });
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "files:importFile",
    async (
      _,
      { filePath, mimeType }: { filePath: string; mimeType: string },
    ): Promise<IpcResult<{ path: string }>> => {
      try {
        const ext = path.extname(filePath).toLowerCase() || "";
        const fileName = `${crypto.randomUUID()}${ext}`;
        const userDataPath = app.getPath("userData");
        const mediaDir = path.join(userDataPath, "media");

        // Ensure directory exists
        if (!fs.existsSync(mediaDir)) {
          fs.mkdirSync(mediaDir, { recursive: true });
        }

        const destinationPath = path.join(mediaDir, fileName);
        const relativePath = path.join("media", fileName).replace(/\\/g, "/");

        // Copy file (async to avoid blocking main thread)
        await fs.promises.copyFile(filePath, destinationPath);

        return success({ path: relativePath });
      } catch (error) {
        console.error("[IPC] files:importFile failed:", error);
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "files:openFile",
    async (
      _,
      { path: relativePath }: { path: string },
    ): Promise<IpcResult<void>> => {
      try {
        const userDataPath = app.getPath("userData");
        const fullPath = path.join(userDataPath, relativePath);

        if (!fs.existsSync(fullPath)) {
          throw new Error("File not found: " + fullPath);
        }

        await shell.openPath(fullPath);
        return success(undefined);
      } catch (error) {
        console.error("[IPC] files:openFile failed:", error);
        return failure(error);
      }
    },
  );

  /**
   * Extract text from a PDF file and update the source item's transcription field.
   * This runs asynchronously after the file has been saved to avoid blocking the Quick Capture flow.
   *
   * @param sourceItemId - The ID of the source item to update
   * @param relativePath - The relative path to the PDF file (e.g., "media/uuid.pdf")
   */
  ipcMain.handle(
    "files:extractPdfText",
    async (
      _,
      {
        sourceItemId,
        relativePath,
      }: { sourceItemId: string; relativePath: string },
    ): Promise<IpcResult<{ text: string; pageCount: number }>> => {
      try {
        const userDataPath = app.getPath("userData");
        const fullPath = path.join(userDataPath, relativePath);

        if (!fs.existsSync(fullPath)) {
          throw new Error("PDF file not found: " + fullPath);
        }

        // Read PDF file
        const dataBuffer = await fs.promises.readFile(fullPath);

        // Extract text (pdf-parse handles malformed PDFs gracefully)
        const pdfData = await pdfParse(dataBuffer, {
          // Limit to first 50 pages for performance (typical medical articles are <50 pages)
          max: 50,
        });

        const extractedText = pdfData.text?.trim() || "";
        const pageCount = pdfData.numpages || 0;

        // Only update if we extracted meaningful text (>50 chars)
        if (extractedText.length > 50) {
          // Update the source item's transcription field
          sourceItemQueries.update(sourceItemId, {
            transcription: extractedText,
          });

          console.log(
            `[IPC] Extracted ${extractedText.length} characters from PDF (${pageCount} pages) for source item ${sourceItemId}`,
          );

          // Notify renderer that OCR is complete (for potential toast notification)
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("files:pdfTextExtracted", {
              sourceItemId,
              textLength: extractedText.length,
              pageCount,
            });
          }

          return success({ text: extractedText, pageCount });
        } else {
          console.warn(
            `[IPC] PDF extraction yielded insufficient text (<50 chars) for ${relativePath}`,
          );
          return success({ text: "", pageCount });
        }
      } catch (error) {
        // Log but don't fail - OCR is a nice-to-have, not critical
        console.error(
          "[IPC] files:extractPdfText failed (non-critical):",
          error,
        );

        // Return empty result instead of failure to avoid user-facing errors
        return success({ text: "", pageCount: 0 });
      }
    },
  );

  ipcMain.handle("app:reload", async (): Promise<IpcResult<void>> => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (!focusedWindow) {
        return failure("No focused window to reload");
      }
      focusedWindow.webContents.reloadIgnoringCache();
      return success(undefined);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle(
    "app:getUserDataPath",
    async (): Promise<IpcResult<string>> => {
      try {
        return success(app.getPath("userData"));
      } catch (error) {
        return failure(error);
      }
    },
  );

  // ============================================================================
  // Reference Ranges
  // ============================================================================

  ipcMain.handle(
    "reference-ranges:getAll",
    async (): Promise<IpcResult<ReferenceRange[]>> => {
      try {
        return success(referenceRangeQueries.getAll());
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "reference-ranges:search",
    async (_event, query: string): Promise<IpcResult<ReferenceRange[]>> => {
      try {
        return success(referenceRangeQueries.search(query));
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "reference-ranges:getByCategory",
    async (_event, category: string): Promise<IpcResult<ReferenceRange[]>> => {
      try {
        return success(referenceRangeQueries.getByCategory(category));
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "reference-ranges:getCategories",
    async (): Promise<IpcResult<string[]>> => {
      try {
        return success(referenceRangeQueries.getCategories());
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle("dev:getSettings", async () => {
    try {
      return success(devSettingsQueries.getAll());
    } catch (e) {
      return failure(e);
    }
  });

  ipcMain.handle("dev:updateSetting", async (_, key: string, value: string) => {
    try {
      devSettingsQueries.set(key, value);
      return success(null);
    } catch (e) {
      return failure(e);
    }
  });

  // ============================================================================
  // Claude Dev Integration
  // ============================================================================

  ipcMain.handle(
    "claudeDev:getStatus",
    async (): Promise<IpcResult<ClaudeDevStatus>> => {
      try {
        const status = await getClaudeDevStatus();
        return success(status);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "claudeDev:captureScreenshot",
    async (
      _,
      rect?: { x: number; y: number; width: number; height: number },
    ): Promise<IpcResult<string | null>> => {
      try {
        const screenshot = await captureScreenshot(rect);
        return success(screenshot);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "claudeDev:sendMessage",
    async (
      _,
      content: string,
      options: {
        screenshot?: string;
        elementInfo?: ElementInfo;
        currentView: string;
      },
    ): Promise<IpcResult<{ response: string; error?: string }>> => {
      try {
        const result = await sendClaudeDevMessage(content, options);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "claudeDev:startSession",
    async (): Promise<IpcResult<string>> => {
      try {
        const sessionId = startClaudeDevSession();
        return success(sessionId);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle("claudeDev:endSession", async (): Promise<IpcResult<void>> => {
    try {
      endClaudeDevSession();
      return success(undefined);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle(
    "claudeDev:getMessages",
    async (): Promise<IpcResult<ClaudeDevMessage[]>> => {
      try {
        return success(getSessionMessages());
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "claudeDev:clearMessages",
    async (): Promise<IpcResult<void>> => {
      try {
        clearSessionMessages();
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  ipcMain.handle(
    "claudeDev:resetClient",
    async (): Promise<IpcResult<void>> => {
      try {
        resetClaudeDevClient();
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    },
  );

  console.log("[IPC] All handlers registered");
}
