import { ipcRenderer, contextBridge, webUtils } from "electron";
import type { IpcResult } from "../src/types/index";

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
    // Notebook v2: Card Activation (v24)
    activate: (id: string, tier?: string, reasons?: string[]) =>
      ipcRenderer.invoke("cards:activate", id, tier, reasons),
    suspend: (id: string, reason: string) =>
      ipcRenderer.invoke("cards:suspend", id, reason),
    bulkActivate: (ids: string[], tier?: string, reasons?: string[]) =>
      ipcRenderer.invoke("cards:bulkActivate", ids, tier, reasons),
    bulkSuspend: (ids: string[], reason: string) =>
      ipcRenderer.invoke("cards:bulkSuspend", ids, reason),
    getByActivationStatus: (status: string) =>
      ipcRenderer.invoke("cards:getByActivationStatus", status),
    getActiveByTopicPage: (topicPageId: string) =>
      ipcRenderer.invoke("cards:getActiveByTopicPage", topicPageId),
    getDormantByTopicPage: (topicPageId: string) =>
      ipcRenderer.invoke("cards:getDormantByTopicPage", topicPageId),
    checkAndSuspendLeech: (id: string) =>
      ipcRenderer.invoke("cards:checkAndSuspendLeech", id),
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
    reextractMetadata: (options?: {
      ids?: string[];
      overwrite?: boolean;
      sourceTypes?: ("qbank" | "quickcapture" | "article" | "pdf" | "all")[];
    }) => ipcRenderer.invoke("sourceItems:reextractMetadata", options),
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
    getByTopic: (topicId: string) =>
      ipcRenderer.invoke("notebookPages:getByTopic", topicId),
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
    // Generic Task Runner
    runTask: (taskId: string, context: any) =>
      ipcRenderer.invoke("ai:runTask", taskId, context),

    // Legacy/Specific methods
    extractConcepts: (content: string) =>
      ipcRenderer.invoke("ai:extractConcepts", content),
    identifyTestedConcept: (sourceContent: string, sourceType: string) =>
      ipcRenderer.invoke("ai:identifyTestedConcept", sourceContent, sourceType),
    analyzeCaptureContent: (content: string) =>
      ipcRenderer.invoke("ai:analyzeCaptureContent", content),
    validateCard: (front: string, back: string, cardType: "qa" | "cloze") =>
      ipcRenderer.invoke("ai:validateCard", front, back, cardType),
    detectMedicalList: (content: string) =>
      ipcRenderer.invoke("ai:detectMedicalList", content),
    convertToVignette: (listItem: string, context: string) =>
      ipcRenderer.invoke("ai:convertToVignette", listItem, context),
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
    // Notebook v2: Quiz System AI (v24)
    extractFacts: (
      sourceContent: string,
      sourceType: string,
      topicContext?: string,
    ) =>
      ipcRenderer.invoke(
        "ai:extractFacts",
        sourceContent,
        sourceType,
        topicContext,
      ),
    generateQuiz: (
      facts: unknown[],
      topicContext: string,
      maxQuestions?: number,
    ) =>
      ipcRenderer.invoke("ai:generateQuiz", facts, topicContext, maxQuestions),
    gradeAnswer: (
      userAnswer: string,
      correctAnswer: string,
      acceptableAnswers: string[],
      questionContext: string,
    ) =>
      ipcRenderer.invoke(
        "ai:gradeAnswer",
        userAnswer,
        correctAnswer,
        acceptableAnswers,
        questionContext,
      ),
    detectConfusion: (
      userAnswer: string,
      correctAnswer: string,
      topicContext: string,
      relatedConcepts?: string[],
    ) =>
      ipcRenderer.invoke(
        "ai:detectConfusion",
        userAnswer,
        correctAnswer,
        topicContext,
        relatedConcepts,
      ),
    analyzeFlashcard: (
      stem: string,
      userAnswer: string,
      correctAnswer: string,
      explanation: string,
      top3VectorMatches: string,
      userRole?: string,
    ) =>
      ipcRenderer.invoke(
        "ai:analyzeFlashcard",
        stem,
        userAnswer,
        correctAnswer,
        explanation,
        top3VectorMatches,
        userRole,
      ),
    // Notebook v4.1: Article Synthesis (Phase 4)
    synthesizeArticle: (
      topicTitle: string,
      blocks: { content: string; sourceItemId: string }[],
    ) => ipcRenderer.invoke("ai:synthesizeArticle", topicTitle, blocks),
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
    setWindowVisibility: (visible: boolean) =>
      ipcRenderer.invoke("app:setWindowVisibility", visible),
    isWindowVisible: () => ipcRenderer.invoke("app:isWindowVisible"),
  },
  referenceRanges: {
    getAll: () => ipcRenderer.invoke("reference-ranges:getAll"),
    search: (query: string) =>
      ipcRenderer.invoke("reference-ranges:search", query),
    getByCategory: (category: string) =>
      ipcRenderer.invoke("reference-ranges:getByCategory", category),
    getCategories: () => ipcRenderer.invoke("reference-ranges:getCategories"),
  },
  remnote: {
    export: (sourceItemId: string, advisorResult?: unknown) =>
      ipcRenderer.invoke("remnote:export", sourceItemId, advisorResult),
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
  // ============================================================================
  // Notebook v2: Quiz & Activation APIs (v24)
  // ============================================================================
  intakeQuiz: {
    saveAttempt: (attempt: unknown) =>
      ipcRenderer.invoke("intakeQuiz:saveAttempt", attempt),
    getBySource: (sourceItemId: string) =>
      ipcRenderer.invoke("intakeQuiz:getBySource", sourceItemId),
    getByBlock: (blockId: string) =>
      ipcRenderer.invoke("intakeQuiz:getByBlock", blockId),
  },
  topicQuiz: {
    saveAttempt: (attempt: unknown) =>
      ipcRenderer.invoke("topicQuiz:saveAttempt", attempt),
    getRecentForTopic: (topicPageId: string, days?: number) =>
      ipcRenderer.invoke("topicQuiz:getRecentForTopic", topicPageId, days),
    shouldPrompt: (topicPageId: string) =>
      ipcRenderer.invoke("topicQuiz:shouldPrompt", topicPageId),
    updateLastVisited: (topicPageId: string) =>
      ipcRenderer.invoke("topicQuiz:updateLastVisited", topicPageId),
    getForgottenBlockIds: (topicPageId: string, thresholdDays?: number) =>
      ipcRenderer.invoke(
        "topicQuiz:getForgottenBlockIds",
        topicPageId,
        thresholdDays,
      ),
  },
  confusionPatterns: {
    create: (pattern: unknown) =>
      ipcRenderer.invoke("confusionPatterns:create", pattern),
    increment: (conceptA: string, conceptB: string, topicId: string) =>
      ipcRenderer.invoke(
        "confusionPatterns:increment",
        conceptA,
        conceptB,
        topicId,
      ),
    find: (conceptA: string, conceptB: string) =>
      ipcRenderer.invoke("confusionPatterns:find", conceptA, conceptB),
    getAll: () => ipcRenderer.invoke("confusionPatterns:getAll"),
    getHighOccurrence: (minOccurrence?: number) =>
      ipcRenderer.invoke("confusionPatterns:getHighOccurrence", minOccurrence),
    setDisambiguationCard: (patternId: string, cardId: string) =>
      ipcRenderer.invoke(
        "confusionPatterns:setDisambiguationCard",
        patternId,
        cardId,
      ),
  },
  // ============================================================================
  // Medical Knowledge Archetypes (v26/v27)
  // ============================================================================
  knowledgeEntities: {
    getAll: () => ipcRenderer.invoke("knowledge-entity:get-all"),
    getById: (id: string) =>
      ipcRenderer.invoke("knowledge-entity:get-by-id", id),
    getByType: (entityType: string) =>
      ipcRenderer.invoke("knowledge-entity:get-by-type", entityType),
    getByDomain: (domain: string) =>
      ipcRenderer.invoke("knowledge-entity:get-by-domain", domain),
    getChildren: (parentId: string) =>
      ipcRenderer.invoke("knowledge-entity:get-children", parentId),
    getAncestors: (id: string) =>
      ipcRenderer.invoke("knowledge-entity:get-ancestors", id),
    insert: (entity: unknown) =>
      ipcRenderer.invoke("knowledge-entity:insert", entity),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke("knowledge-entity:update", id, updates),
    delete: (id: string) => ipcRenderer.invoke("knowledge-entity:delete", id),
    findSimilar: (title: string, threshold?: number) =>
      ipcRenderer.invoke("knowledge-entity:find-similar", title, threshold),
    findExactDuplicate: (entityType: string, title: string) =>
      ipcRenderer.invoke(
        "knowledge-entity:find-exact-duplicate",
        entityType,
        title,
      ),
    setGoldenTicket: (id: string, value: string) =>
      ipcRenderer.invoke("knowledge-entity:set-golden-ticket", id, value),
    revealHint: (id: string) =>
      ipcRenderer.invoke("knowledge-entity:reveal-hint", id),
    search: (
      query: string,
      options?: { entityType?: string; domain?: string; limit?: number },
    ) => ipcRenderer.invoke("knowledge-entity:search", query, options),
    getLinks: (
      entityId: string,
      direction?: "outgoing" | "incoming" | "both",
    ) => ipcRenderer.invoke("knowledge-entity:get-links", entityId, direction),
    getLinkedEntities: (entityId: string) =>
      ipcRenderer.invoke("knowledge-entity:get-linked-entities", entityId),
    getLinkedByType: (
      entityId: string,
      linkType: string,
      direction?: "outgoing" | "incoming",
    ) =>
      ipcRenderer.invoke(
        "knowledge-entity:get-linked-by-type",
        entityId,
        linkType,
        direction,
      ),
    link: (sourceId: string, targetId: string, linkType: string) =>
      ipcRenderer.invoke("knowledge-entity:link", sourceId, targetId, linkType),
    unlink: (linkId: string) =>
      ipcRenderer.invoke("knowledge-entity:unlink", linkId),
    linkExists: (sourceId: string, targetId: string, linkType?: string) =>
      ipcRenderer.invoke(
        "knowledge-entity:link-exists",
        sourceId,
        targetId,
        linkType,
      ),
  },
  blockTopicAssignments: {
    create: (assignment: unknown) =>
      ipcRenderer.invoke("blockTopicAssignments:create", assignment),
    getByBlock: (blockId: string) =>
      ipcRenderer.invoke("blockTopicAssignments:getByBlock", blockId),
    getByTopicPage: (topicPageId: string) =>
      ipcRenderer.invoke("blockTopicAssignments:getByTopicPage", topicPageId),
    setPrimary: (blockId: string, topicPageId: string) =>
      ipcRenderer.invoke(
        "blockTopicAssignments:setPrimary",
        blockId,
        topicPageId,
      ),
    remove: (blockId: string, topicPageId: string) =>
      ipcRenderer.invoke("blockTopicAssignments:remove", blockId, topicPageId),
    bulkCreate: (
      blockId: string,
      topicPageIds: string[],
      primaryTopicPageId: string,
    ) =>
      ipcRenderer.invoke(
        "blockTopicAssignments:bulkCreate",
        blockId,
        topicPageIds,
        primaryTopicPageId,
      ),
    getTopicPageIds: (blockId: string) =>
      ipcRenderer.invoke("blockTopicAssignments:getTopicPageIds", blockId),
  },
  // ============================================================================
  // Practice Bank & Simulator (v28)
  // ============================================================================
  practiceBank: {
    // Card CRUD & Queries
    getByEntityId: (entityId: string) =>
      ipcRenderer.invoke("practice-bank:get-by-entity-id", entityId),
    getById: (id: string) => ipcRenderer.invoke("practice-bank:get-by-id", id),
    getActive: () => ipcRenderer.invoke("practice-bank:get-active"),
    getDueToday: () => ipcRenderer.invoke("practice-bank:get-due-today"),
    getByMaturityState: (state: string) =>
      ipcRenderer.invoke("practice-bank:get-by-maturity-state", state),

    // Card Generation
    generateCards: (entityId: string) =>
      ipcRenderer.invoke("practice-bank:generate-cards", entityId),
    getExpectedCardCount: (entityId: string) =>
      ipcRenderer.invoke("practice-bank:get-expected-card-count", entityId),
    isEntityReadyForForging: (entityId: string) =>
      ipcRenderer.invoke("practice-bank:is-entity-ready-for-forging", entityId),

    // Card Lifecycle
    activate: (id: string) => ipcRenderer.invoke("practice-bank:activate", id),
    deactivate: (id: string) =>
      ipcRenderer.invoke("practice-bank:deactivate", id),
    retire: (id: string) => ipcRenderer.invoke("practice-bank:retire", id),
    resurrect: (id: string) =>
      ipcRenderer.invoke("practice-bank:resurrect", id),

    // FSRS State Updates
    updateFsrsState: (id: string, fsrsState: unknown) =>
      ipcRenderer.invoke("practice-bank:update-fsrs-state", id, fsrsState),
  },
  simulator: {
    // Attempt Recording
    recordAttempt: (attempt: unknown) =>
      ipcRenderer.invoke("simulator:record-attempt", attempt),
    getByEntityId: (entityId: string) =>
      ipcRenderer.invoke("simulator:get-by-entity-id", entityId),
    getDailyCountByEntity: (entityId: string, date?: string) =>
      ipcRenderer.invoke("simulator:get-daily-count", entityId, date),
    getFailureRateByEntity: (entityId: string) =>
      ipcRenderer.invoke("simulator:get-failure-rate", entityId),
  },
  // ============================================================================
  // Claude Dev Integration
  // ============================================================================
  claudeDev: {
    // Status & Session
    getStatus: () => ipcRenderer.invoke("claudeDev:getStatus"),
    startSession: () => ipcRenderer.invoke("claudeDev:startSession"),
    endSession: () => ipcRenderer.invoke("claudeDev:endSession"),
    getMessages: () => ipcRenderer.invoke("claudeDev:getMessages"),
    clearMessages: () => ipcRenderer.invoke("claudeDev:clearMessages"),
    resetClient: () => ipcRenderer.invoke("claudeDev:resetClient"),

    // Screenshot
    captureScreenshot: (rect?: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => ipcRenderer.invoke("claudeDev:captureScreenshot", rect),

    // Messaging
    sendMessage: (
      content: string,
      options: {
        screenshot?: string;
        elementInfo?: {
          selector: string;
          tagName: string;
          className: string;
          id?: string;
          textContent?: string;
          boundingRect: {
            x: number;
            y: number;
            width: number;
            height: number;
          };
        };
        currentView: string;
      },
    ) => ipcRenderer.invoke("claudeDev:sendMessage", content, options),

    sendMessageStreaming: (
      content: string,
      options: {
        screenshot?: string;
        elementInfo?: {
          selector: string;
          tagName: string;
          className: string;
          id?: string;
          textContent?: string;
          boundingRect: {
            x: number;
            y: number;
            width: number;
            height: number;
          };
        };
        currentView: string;
      },
    ) => ipcRenderer.invoke("claudeDev:sendMessageStreaming", content, options),

    // Model Selection
    getModels: () => ipcRenderer.invoke("claudeDev:getModels"),
    getModel: () => ipcRenderer.invoke("claudeDev:getModel"),
    setModel: (model: string) =>
      ipcRenderer.invoke("claudeDev:setModel", model),

    // Conversation History
    getHistory: () => ipcRenderer.invoke("claudeDev:getHistory"),
    loadConversation: (id: string) =>
      ipcRenderer.invoke("claudeDev:loadConversation", id),
    deleteConversation: (id: string) =>
      ipcRenderer.invoke("claudeDev:deleteConversation", id),
    renameConversation: (id: string, title: string) =>
      ipcRenderer.invoke("claudeDev:renameConversation", id, title),

    // Session Stats / Cost Tracking
    getSessionStats: () => ipcRenderer.invoke("claudeDev:getSessionStats"),

    // IPC Listeners
    onMessage: (
      callback: (message: {
        id: string;
        role: "user" | "assistant";
        content: string;
        timestamp: number;
        screenshot?: string;
        elementInfo?: unknown;
        isStreaming?: boolean;
        model?: string;
        usage?: {
          inputTokens: number;
          outputTokens: number;
        };
        cost?: {
          inputCost: number;
          outputCost: number;
          totalCost: number;
        };
      }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        message: {
          id: string;
          role: "user" | "assistant";
          content: string;
          timestamp: number;
          screenshot?: string;
          elementInfo?: unknown;
          isStreaming?: boolean;
          model?: string;
          usage?: {
            inputTokens: number;
            outputTokens: number;
          };
          cost?: {
            inputCost: number;
            outputCost: number;
            totalCost: number;
          };
        },
      ) => callback(message);
      ipcRenderer.on("claudeDev:message", handler);
      return () => ipcRenderer.removeListener("claudeDev:message", handler);
    },

    onChunk: (
      callback: (chunk: {
        messageId: string;
        content: string;
        fullContent: string;
      }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        chunk: {
          messageId: string;
          content: string;
          fullContent: string;
        },
      ) => callback(chunk);
      ipcRenderer.on("claudeDev:chunk", handler);
      return () => ipcRenderer.removeListener("claudeDev:chunk", handler);
    },

    onStreamEnd: (callback: (messageId: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, messageId: string) =>
        callback(messageId);
      ipcRenderer.on("claudeDev:streamEnd", handler);
      return () => ipcRenderer.removeListener("claudeDev:streamEnd", handler);
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
