import { ipcMain, BrowserWindow } from "electron";
import path from "node:path";
import {
  cardQueries,
  noteQueries,
  reviewLogQueries,
  quickDumpQueries,
  connectionQueries,
  getDatabaseStatus,
  getDbPath,
  DbCard,
  DbNote,
  DbReviewLog,
  DbQuickDump,
  DbConnection,
  ExtractionStatus,
  DbStatus,
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
  findRelatedNotes,
  aiCache,
  type AIProviderStatus,
  type ConceptExtractionResult,
  type ExtractedConcept,
  type ValidationResult,
  type MedicalListDetection,
  type VignetteConversion,
} from "./ai-service";

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
      rating: Rating
    ): Promise<
      IpcResult<{
        card: DbCard;
        reviewLog: DbReviewLog;
        intervals: { again: number; hard: number; good: number; easy: number };
      }>
    > => {
      try {
        const result = scheduleReview(cardId, rating);
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
  // Quick Dump Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle(
    "quickDumps:getAll",
    async (): Promise<IpcResult<DbQuickDump[]>> => {
      try {
        const dumps = quickDumpQueries.getAll();
        return success(dumps);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "quickDumps:getByStatus",
    async (_, status: ExtractionStatus): Promise<IpcResult<DbQuickDump[]>> => {
      try {
        const dumps = quickDumpQueries.getByStatus(status);
        return success(dumps);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "quickDumps:create",
    async (_, dump: DbQuickDump): Promise<IpcResult<DbQuickDump>> => {
      try {
        quickDumpQueries.insert(dump);
        return success(dump);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "quickDumps:update",
    async (
      _,
      id: string,
      updates: Partial<DbQuickDump>
    ): Promise<IpcResult<void>> => {
      try {
        quickDumpQueries.update(id, updates);
        return success(undefined);
      } catch (error) {
        return failure(error);
      }
    }
  );

  ipcMain.handle(
    "quickDumps:remove",
    async (_, id: string): Promise<IpcResult<void>> => {
      try {
        quickDumpQueries.delete(id);
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

  ipcMain.handle("app:reload", () => {
    BrowserWindow.getFocusedWindow()?.webContents.reloadIgnoringCache();
  });

  console.log("[IPC] All handlers registered");
}
