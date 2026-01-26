import { ipcRenderer, contextBridge, webUtils } from "electron";

// ============================================================================
// Typed API for renderer process
// ============================================================================

const api = {
  cards: {
    getAll: () => ipcRenderer.invoke("cards:getAll"),
    getById: (id: string) => ipcRenderer.invoke("cards:getById", id),
    getDueToday: () => ipcRenderer.invoke("cards:getDueToday"),
    create: (card: unknown) => ipcRenderer.invoke("cards:create", card),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke("cards:update", id, updates),
    remove: (id: string) => ipcRenderer.invoke("cards:remove", id),
    getTopicMetadata: (pageId: string) =>
      ipcRenderer.invoke("cards:getTopicMetadata", pageId),
    getWeakTopicSummaries: () =>
      ipcRenderer.invoke("cards:getWeakTopicSummaries"),
    getBrowserList: (filters?: unknown, sort?: unknown) =>
      ipcRenderer.invoke("cards:getBrowserList", filters, sort),
    getBySiblings: (sourceBlockId: string) =>
      ipcRenderer.invoke("cards:getBySiblings", sourceBlockId),
    findDuplicateFrontBack: () =>
      ipcRenderer.invoke("cards:findDuplicateFrontBack"),
    getLowEaseTopics: () => ipcRenderer.invoke("cards:getLowEaseTopics"),
    getGlobalStats: () => ipcRenderer.invoke("cards:getGlobalStats"),
  },
  notes: {
    getAll: () => ipcRenderer.invoke("notes:getAll"),
    getById: (id: string) => ipcRenderer.invoke("notes:getById", id),
    create: (note: unknown) => ipcRenderer.invoke("notes:create", note),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke("notes:update", id, updates),
    remove: (id: string) => ipcRenderer.invoke("notes:remove", id),
  },
  reviews: {
    log: (review: unknown) => ipcRenderer.invoke("reviews:log", review),
    getByCard: (cardId: string) =>
      ipcRenderer.invoke("reviews:getByCard", cardId),
    schedule: (
      cardId: string,
      rating: number,
      responseTimeMs?: number | null,
      confidenceRating?: string | null,
    ) =>
      ipcRenderer.invoke(
        "reviews:schedule",
        cardId,
        rating,
        responseTimeMs,
        confidenceRating,
      ),
  },
  quickCaptures: {
    getAll: () => ipcRenderer.invoke("quickCaptures:getAll"),
    getByStatus: (status: string) =>
      ipcRenderer.invoke("quickCaptures:getByStatus", status),
    create: (capture: unknown) =>
      ipcRenderer.invoke("quickCaptures:create", capture),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke("quickCaptures:update", id, updates),
    remove: (id: string) => ipcRenderer.invoke("quickCaptures:remove", id),
  },
  connections: {
    getAll: () => ipcRenderer.invoke("connections:getAll"),
    getByNote: (noteId: string) =>
      ipcRenderer.invoke("connections:getByNote", noteId),
    create: (connection: unknown) =>
      ipcRenderer.invoke("connections:create", connection),
    remove: (id: string) => ipcRenderer.invoke("connections:remove", id),
  },
  sourceItems: {
    getAll: () => ipcRenderer.invoke("sourceItems:getAll"),
    getByStatus: (status: string) =>
      ipcRenderer.invoke("sourceItems:getByStatus", status),
    getById: (id: string) => ipcRenderer.invoke("sourceItems:getById", id),
    create: (item: unknown) => ipcRenderer.invoke("sourceItems:create", item),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke("sourceItems:update", id, updates),
    delete: (id: string) => ipcRenderer.invoke("sourceItems:delete", id),
    getRawPage: (sourceItemId: string) =>
      ipcRenderer.invoke("sourceItems:getRawPage", sourceItemId),
    purgeRawPages: () => ipcRenderer.invoke("sourceItems:purgeRawPages"),
    reparseFromRaw: (sourceItemId: string) =>
      ipcRenderer.invoke("sourceItems:reparseFromRaw", sourceItemId),
    reparseAllFromRaw: (options?: {
      siteName?: "MKSAP 19" | "ACEP PeerPrep";
    }) => ipcRenderer.invoke("sourceItems:reparseAllFromRaw", options),
    onReparseProgress: (
      callback: (progress: {
        current: number;
        total: number;
        succeeded: number;
        failed: number;
        skipped: number;
      }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        progress: {
          current: number;
          total: number;
          succeeded: number;
          failed: number;
          skipped: number;
        },
      ) => callback(progress);
      ipcRenderer.on("sourceItems:reparseFromRaw:progress", handler);
      return () =>
        ipcRenderer.removeListener(
          "sourceItems:reparseFromRaw:progress",
          handler,
        );
    },
    reextractMetadata: (options?: { ids?: string[]; overwrite?: boolean }) =>
      ipcRenderer.invoke("sourceItems:reextractMetadata", options),
    onReextractProgress: (
      callback: (progress: {
        current: number;
        total: number;
        succeeded: number;
        failed: number;
        currentItem?: string;
        status?: "running" | "cancelled" | "restoring" | "complete";
      }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        progress: {
          current: number;
          total: number;
          succeeded: number;
          failed: number;
          currentItem?: string;
          status?: "running" | "cancelled" | "restoring" | "complete";
        },
      ) => callback(progress);
      ipcRenderer.on("sourceItems:reextractMetadata:progress", handler);
      return () =>
        ipcRenderer.removeListener(
          "sourceItems:reextractMetadata:progress",
          handler,
        );
    },
    cancelReextract: () => ipcRenderer.invoke("sourceItems:cancelReextract"),
    onNew: (callback: (item: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, item: unknown) =>
        callback(item);
      ipcRenderer.on("sourceItems:new", handler);
      return () => ipcRenderer.removeListener("sourceItems:new", handler);
    },
    onAIExtraction: (
      callback: (payload: {
        sourceItemId: string;
        status: "started" | "completed" | "failed";
        metadata?: {
          summary?: string;
          subject?: string;
          questionType?: string;
        };
      }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: {
          sourceItemId: string;
          status: "started" | "completed" | "failed";
          metadata?: {
            summary?: string;
            subject?: string;
            questionType?: string;
          };
        },
      ) => callback(payload);
      ipcRenderer.on("sourceItems:aiExtraction", handler);
      return () =>
        ipcRenderer.removeListener("sourceItems:aiExtraction", handler);
    },
  },
  canonicalTopics: {
    getAll: () => ipcRenderer.invoke("canonicalTopics:getAll"),
    getById: (id: string) => ipcRenderer.invoke("canonicalTopics:getById", id),
    getByDomain: (domain: string) =>
      ipcRenderer.invoke("canonicalTopics:getByDomain", domain),
    resolveAlias: (name: string) =>
      ipcRenderer.invoke("canonicalTopics:resolveAlias", name),
    createOrGet: (name: string, domain?: string) =>
      ipcRenderer.invoke("canonicalTopics:createOrGet", name, domain),
    addAlias: (topicId: string, alias: string) =>
      ipcRenderer.invoke("canonicalTopics:addAlias", topicId, alias),
    suggestMatches: (input: string) =>
      ipcRenderer.invoke("canonicalTopics:suggestMatches", input),
    merge: (sourceId: string, targetId: string) =>
      ipcRenderer.invoke("canonicalTopics:merge", sourceId, targetId),
  },
  notebookPages: {
    getAll: () => ipcRenderer.invoke("notebookPages:getAll"),
    getById: (id: string) => ipcRenderer.invoke("notebookPages:getById", id),
    create: (page: unknown) => ipcRenderer.invoke("notebookPages:create", page),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke("notebookPages:update", id, updates),
    delete: (id: string) => ipcRenderer.invoke("notebookPages:delete", id),
  },
  notebook: {
    getTopicsWithStats: () => ipcRenderer.invoke("notebook:getTopicsWithStats"),
  },
  notebookBlocks: {
    getByPage: (pageId: string, options?: { highYieldOnly?: boolean }) =>
      ipcRenderer.invoke("notebookBlocks:getByPage", pageId, options),
    getById: (id: string) => ipcRenderer.invoke("notebookBlocks:getById", id),
    getBySourceId: (sourceId: string) =>
      ipcRenderer.invoke("notebookBlocks:getBySourceId", sourceId),
    getBySource: (sourceId: string) =>
      ipcRenderer.invoke("notebookBlocks:getBySource", sourceId),
    create: (block: unknown) =>
      ipcRenderer.invoke("notebookBlocks:create", block),
    addToAnotherTopic: (payload: unknown) =>
      ipcRenderer.invoke("notebookBlocks:addToAnotherTopic", payload),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke("notebookBlocks:update", id, updates),
    toggleHighYield: (blockId: string) =>
      ipcRenderer.invoke("notebookBlocks:toggleHighYield", blockId),
    delete: (id: string) => ipcRenderer.invoke("notebookBlocks:delete", id),
    searchByContent: (query: string, excludeBlockId?: string, limit?: number) =>
      ipcRenderer.invoke("notebookBlocks:searchByContent", {
        query,
        excludeBlockId,
        limit,
      }),
  },
  notebookLinks: {
    create: (link: unknown) => ipcRenderer.invoke("notebookLinks:create", link),
    getBySourceBlock: (blockId: string) =>
      ipcRenderer.invoke("notebookLinks:getBySourceBlock", blockId),
    getByTargetBlock: (blockId: string) =>
      ipcRenderer.invoke("notebookLinks:getByTargetBlock", blockId),
    delete: (id: string) => ipcRenderer.invoke("notebookLinks:delete", id),
  },
  smartViews: {
    getAll: () => ipcRenderer.invoke("smartViews:getAll"),
    getSystem: () => ipcRenderer.invoke("smartViews:getSystem"),
  },
  search: {
    query: (query: string, filter?: string) =>
      ipcRenderer.invoke("search:query", query, filter),
  },
  backup: {
    list: () => ipcRenderer.invoke("backup:list"),
    getLastTimestamp: () => ipcRenderer.invoke("backup:getLastTimestamp"),
    create: () => ipcRenderer.invoke("backup:create"),
    selectFile: () => ipcRenderer.invoke("backup:selectFile"),
    restore: (filePath: string) =>
      ipcRenderer.invoke("backup:restore", filePath),
    cleanup: (retentionDays?: number) =>
      ipcRenderer.invoke("backup:cleanup", retentionDays),
    onAutoComplete: (callback: (timestamp: string) => void) => {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        timestamp: string,
      ) => callback(timestamp);
      ipcRenderer.on("backup:auto-complete", subscription);
      return () =>
        ipcRenderer.removeListener("backup:auto-complete", subscription);
    },
  },
  db: {
    status: () => ipcRenderer.invoke("db:status"),
    getPath: () => ipcRenderer.invoke("db:getPath"),
  },
  ai: {
    getProviderStatus: () => ipcRenderer.invoke("ai:getProviderStatus"),
    extractConcepts: (content: string) =>
      ipcRenderer.invoke("ai:extractConcepts", content),
    evaluateInsight: (input: {
      userInsight: string;
      sourceContent: string;
      isIncorrect: boolean;
      topicContext?: string;
      blockId?: string;
    }) => ipcRenderer.invoke("ai:evaluateInsight", input),
    identifyTestedConcept: (sourceContent: string, sourceType: string) =>
      ipcRenderer.invoke("ai:identifyTestedConcept", sourceContent, sourceType),
    polishInsight: (
      userText: string,
      sourceContent: string,
      testedConcept?: string,
    ) =>
      ipcRenderer.invoke(
        "ai:polishInsight",
        userText,
        sourceContent,
        testedConcept,
      ),
    analyzeCaptureContent: (content: string) =>
      ipcRenderer.invoke("ai:analyzeCaptureContent", content),
    validateCard: (front: string, back: string, cardType: "qa" | "cloze") =>
      ipcRenderer.invoke("ai:validateCard", front, back, cardType),
    detectMedicalList: (content: string) =>
      ipcRenderer.invoke("ai:detectMedicalList", content),
    convertToVignette: (listItem: string, context: string) =>
      ipcRenderer.invoke("ai:convertToVignette", listItem, context),
    generateCards: (
      blockContent: string,
      topicContext: string,
      userIntent?: string,
    ) =>
      ipcRenderer.invoke(
        "ai:generateCards",
        blockContent,
        topicContext,
        userIntent,
      ),
    generateCardsFromTopic: (
      topicName: string,
      blocks: Array<{
        id: string;
        content: string;
        userInsight?: string;
        calloutType?: "pearl" | "trap" | "caution" | null;
        isHighYield?: boolean; // v22: High-yield marker for prioritization
      }>,
    ) => ipcRenderer.invoke("ai:generateCardsFromTopic", topicName, blocks),
    generateElaboratedFeedback: (
      card: { front: string; back: string; cardType: string },
      topicContext: string,
      responseTimeMs: number | null,
    ) =>
      ipcRenderer.invoke(
        "ai:generateElaboratedFeedback",
        card,
        topicContext,
        responseTimeMs,
      ),
    suggestTags: (content: string) =>
      ipcRenderer.invoke("ai:suggestTags", content),
    findRelatedNotes: (
      content: string,
      minSimilarity?: number,
      maxResults?: number,
    ) =>
      ipcRenderer.invoke(
        "ai:findRelatedNotes",
        content,
        minSimilarity,
        maxResults,
      ),
    clearCache: () => ipcRenderer.invoke("ai:clearCache"),
    onOllamaStatus: (
      callback: (payload: { status: string; message: string }) => void,
    ) => {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        payload: { status: string; message: string },
      ) => callback(payload);
      ipcRenderer.on("ai:ollamaStatus", subscription);
      return () => ipcRenderer.removeListener("ai:ollamaStatus", subscription);
    },
    getOllamaModels: () => ipcRenderer.invoke("ai:getOllamaModels"),
  },
  insights: {
    getBoardRelevance: (topicTags: string[]) =>
      ipcRenderer.invoke("insights:getBoardRelevance", topicTags),
    getExamTrapBreakdown: () =>
      ipcRenderer.invoke("insights:getExamTrapBreakdown"),
    getConfusionPairs: () => ipcRenderer.invoke("insights:getConfusionPairs"),
  },
  files: {
    saveImage: (data: string, mimeType: string) =>
      ipcRenderer.invoke("files:saveImage", { data, mimeType }),
    importFile: (filePath: string, mimeType: string) =>
      ipcRenderer.invoke("files:importFile", { filePath, mimeType }),
    openFile: (path: string) => ipcRenderer.invoke("files:openFile", { path }),
    extractPdfText: (sourceItemId: string, relativePath: string) =>
      ipcRenderer.invoke("files:extractPdfText", {
        sourceItemId,
        relativePath,
      }),
    onPdfTextExtracted: (
      callback: (payload: {
        sourceItemId: string;
        textLength: number;
        pageCount: number;
      }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: {
          sourceItemId: string;
          textLength: number;
          pageCount: number;
        },
      ) => callback(payload);
      ipcRenderer.on("files:pdfTextExtracted", handler);
      return () =>
        ipcRenderer.removeListener("files:pdfTextExtracted", handler);
    },
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke("settings:get", key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke("settings:set", key, value),
    getParsed: (key: string, defaultValue: unknown) =>
      ipcRenderer.invoke("settings:getParsed", key, defaultValue),
    getAll: () => ipcRenderer.invoke("settings:getAll"),
  },
  capture: {
    getStatus: (): Promise<IpcResult<{ isRunning: boolean; port: number }>> =>
      ipcRenderer.invoke("capture:getStatus"),
    process: (payload: unknown) =>
      ipcRenderer.invoke("capture:process", payload),
    onReceived: (callback: (payload: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown) =>
        callback(payload);
      ipcRenderer.on("capture:received", handler);
      return () => ipcRenderer.removeListener("capture:received", handler);
    },
  },
  app: {
    getUserDataPath: () => ipcRenderer.invoke("app:getUserDataPath"),
  },
  referenceRanges: {
    getAll: () => ipcRenderer.invoke("reference-ranges:getAll"),
    search: (query: string) =>
      ipcRenderer.invoke("reference-ranges:search", query),
    getByCategory: (category: string) =>
      ipcRenderer.invoke("reference-ranges:getByCategory", category),
    getCategories: () => ipcRenderer.invoke("reference-ranges:getCategories"),
  },
  dev: {
    getSettings: () => ipcRenderer.invoke("dev:getSettings"),
    updateSetting: (key: string, value: string) =>
      ipcRenderer.invoke("dev:updateSetting", key, value),
    onAILog: (callback: (payload: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: any) =>
        callback(payload);
      ipcRenderer.on("ai:log", handler);
      return () => ipcRenderer.removeListener("ai:log", handler);
    },
  },
  reloadApp: () => ipcRenderer.invoke("app:reload"),
};

// Expose typed API to renderer
contextBridge.exposeInMainWorld("api", api);

// Keep legacy ipcRenderer for backwards compatibility during migration
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args),
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});
