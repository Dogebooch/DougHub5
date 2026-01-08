import { ipcMain, BrowserWindow, app } from "electron";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
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
  smartViewQueries,
  searchQueries,
  settingsQueries,
  getDatabaseStatus,
  getDbPath,
  DbCard,
  DbNote,
  DbReviewLog,
  DbQuickCapture,
  DbConnection,
  DbSourceItem,
  DbCanonicalTopic,
  DbNotebookTopicPage,
  DbNotebookBlock,
  DbSmartView,
  ExtractionStatus,
  SourceItemStatus,
  DbStatus,
  SearchFilter,
  SearchResult,
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
  BackupInfo,
} from "./backup-service";
import {
  getProviderStatus,
  extractConcepts,
  validateCard,
  detectMedicalList,
  convertToVignette,
  suggestTags,
  generateCardFromBlock,
  findRelatedNotes,
  aiCache,
  type AIProviderStatus,
  type ConceptExtractionResult,
  type ValidationResult,
  type MedicalListDetection,
  type VignetteConversion,
  type CardSuggestion,
} from "./ai-service";
import {
  resolveTopicAlias,
  createOrGetTopic,
  suggestTopicMatches,
  addTopicAlias,
  mergeTopics,
} from "./topic-service";

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
        const cards = cardQueries.getAll();
        const card = cards.find((c) => c.id === id) ?? null;
        return success(card);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "cards:getDueToday",
    async (): Promise<IpcResult<DbCard[]>> => {
      try {
        const cards = cardQueries.getAll();
        const today = new Date().toISOString().split("T")[0];
        const dueCards = cards.filter((c) => c.dueDate <= today);
        return success(dueCards);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "cards:getTopicMetadata",
    async (
      _,
      pageId: string
    ): Promise<IpcResult<{ name: string; cardCount: number } | null>> => {
      try {
        const metadata = cardQueries.getTopicMetadata(pageId);
        return success(metadata);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "cards:create",
    async (_, card: DbCard): Promise<IpcResult<DbCard>> => {
      try {
        cardQueries.insert(card);
        return success(card);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "cards:update",
    async (
      _,
      id: string,
      updates: Partial<DbCard>
    ): Promise<IpcResult<void>> => {
      try {
        cardQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
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
        const notes = noteQueries.getAll();
        const note = notes.find((n) => n.id === id) ?? null;
        return success(note);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
  );

  ipcMain.handle(
    "notes:update",
    async (
      _,
      id: string,
      updates: Partial<DbNote>
    ): Promise<IpcResult<void>> => {
      try {
        noteQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
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
    }
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
    }
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
      responseTimeMs?: number | null
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
          responseTimeMs
        );
        return success(result);
      } catch (error) {
        return failure(error);
      }
    }
  );

  /**
   * Get interval previews for a card without committing a review.
   * Returns formatted intervals for display on rating buttons.
   */
  ipcMain.handle(
    "reviews:getIntervals",
    async (
      _,
      cardId: string
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
    }
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
    }
  );

  ipcMain.handle(
    "quickCaptures:getByStatus",
    async (
      _,
      status: ExtractionStatus
    ): Promise<IpcResult<DbQuickCapture[]>> => {
      try {
        const captures = quickCaptureQueries.getByStatus(status);
        return success(captures);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
  );

  ipcMain.handle(
    "quickCaptures:update",
    async (
      _,
      id: string,
      updates: Partial<DbQuickCapture>
    ): Promise<IpcResult<void>> => {
      try {
        quickCaptureQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
  );

  ipcMain.handle(
    "sourceItems:create",
    async (_, item: DbSourceItem): Promise<IpcResult<DbSourceItem>> => {
      try {
        sourceItemQueries.insert(item);
        return success(item);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "sourceItems:update",
    async (
      _,
      id: string,
      updates: Partial<DbSourceItem>
    ): Promise<IpcResult<void>> => {
      try {
        sourceItemQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
  );

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
    }
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
    }
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
    }
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
    }
  );

  ipcMain.handle(
    "canonicalTopics:createOrGet",
    async (
      _,
      name: string,
      domain?: string
    ): Promise<IpcResult<DbCanonicalTopic>> => {
      try {
        const topic = createOrGetTopic(name, domain);
        return success(topic);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
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
    }
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
    }
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
    }
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
    }
  );

  ipcMain.handle(
    "notebookPages:create",
    async (
      _,
      page: DbNotebookTopicPage
    ): Promise<IpcResult<DbNotebookTopicPage>> => {
      try {
        notebookTopicPageQueries.insert(page);
        return success(page);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "notebookPages:update",
    async (
      _,
      id: string,
      updates: Partial<DbNotebookTopicPage>
    ): Promise<IpcResult<void>> => {
      try {
        notebookTopicPageQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    }
  );

  // --------------------------------------------------------------------------
  // Notebook Block Handlers (v3)
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "notebookBlocks:getByPage",
    async (_, pageId: string): Promise<IpcResult<DbNotebookBlock[]>> => {
      try {
        const blocks = notebookBlockQueries.getByPage(pageId);
        return success(blocks);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
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
    }
  );

  ipcMain.handle(
    "notebookBlocks:update",
    async (
      _,
      id: string,
      updates: Partial<DbNotebookBlock>
    ): Promise<IpcResult<void>> => {
      try {
        notebookBlockQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
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
    }
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
    }
  );

  // --------------------------------------------------------------------------
  // Search Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "search:query",
    async (
      _,
      query: string,
      filter?: SearchFilter
    ): Promise<IpcResult<SearchResult>> => {
      try {
        const result = searchQueries.search(query, filter || "all");
        return success(result);
      } catch (error) {
        return failure(error);
      }
    }
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
    "backup:restore",
    async (_, filename: string): Promise<IpcResult<void>> => {
      try {
        const dbPath = getDbPath();
        if (!dbPath) {
          throw new Error("Database not initialized");
        }
        const backupPath = path.join(getBackupsDir(), filename);
        restoreBackup(backupPath, dbPath);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
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
    }
  );

  ipcMain.handle(
    "ai:extractConcepts",
    async (_, content: string): Promise<IpcResult<ConceptExtractionResult>> => {
      try {
        // Check cache first
        const cacheKey = aiCache.key("extractConcepts", content);
        const cached = aiCache.get<ConceptExtractionResult>(cacheKey);
        if (cached) {
          console.log("[IPC] ai:extractConcepts cache hit");
          return success(cached);
        }

        const result = await extractConcepts(content);
        aiCache.set(cacheKey, result);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "ai:validateCard",
    async (
      _,
      front: string,
      back: string,
      cardType: "qa" | "cloze"
    ): Promise<IpcResult<ValidationResult>> => {
      try {
        const cacheKey = aiCache.key("validateCard", front, back, cardType);
        const cached = aiCache.get<ValidationResult>(cacheKey);
        if (cached) {
          console.log("[IPC] ai:validateCard cache hit");
          return success(cached);
        }

        const result = await validateCard(front, back, cardType);
        aiCache.set(cacheKey, result);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "ai:detectMedicalList",
    async (_, content: string): Promise<IpcResult<MedicalListDetection>> => {
      try {
        const cacheKey = aiCache.key("detectMedicalList", content);
        const cached = aiCache.get<MedicalListDetection>(cacheKey);
        if (cached) {
          console.log("[IPC] ai:detectMedicalList cache hit");
          return success(cached);
        }

        const result = await detectMedicalList(content);
        aiCache.set(cacheKey, result);
        return success(result);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "ai:convertToVignette",
    async (
      _,
      listItem: string,
      context: string
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
    }
  );

  ipcMain.handle(
    "ai:generateCards",
    async (
      _,
      blockContent: string,
      topicContext: string,
      userIntent?: string
    ): Promise<IpcResult<CardSuggestion[]>> => {
      try {
        const cards = await generateCardFromBlock(
          blockContent,
          topicContext,
          userIntent
        );
        return success(cards);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
  );

  ipcMain.handle(
    "ai:findRelatedNotes",
    async (
      _,
      content: string,
      minSimilarity?: number,
      maxResults?: number
    ): Promise<IpcResult<Array<{ noteId: string; similarity: number }>>> => {
      try {
        // Get all notes for comparison
        const notes = noteQueries.getAll();
        const matches = findRelatedNotes(
          content,
          notes,
          minSimilarity,
          maxResults
        );
        return success(matches);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
  );

  ipcMain.handle(
    "settings:set",
    async (_, key: string, value: string): Promise<IpcResult<void>> => {
      try {
        settingsQueries.set(key, value);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "settings:getParsed",
    async (
      _,
      key: string,
      defaultValue: unknown
    ): Promise<IpcResult<unknown>> => {
      try {
        const value = settingsQueries.getParsed(key, defaultValue);
        return success(value);
      } catch (error) {
        return failure(error);
      }
    }
  );

  // --------------------------------------------------------------------------
  // File Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "files:saveImage",
    async (
      _,
      { data, mimeType }: { data: string; mimeType: string }
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
    }
  );

  ipcMain.handle("app:reload", () => {
    BrowserWindow.getFocusedWindow()?.webContents.reloadIgnoringCache();
  });

  console.log("[IPC] All handlers registered");
}
