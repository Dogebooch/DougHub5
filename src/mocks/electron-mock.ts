/* eslint-disable */
import { IpcResult } from "../types";

// Helper to create consistent success responses
function success<T>(data: T): IpcResult<T> {
  return { success: true, data };
}

// Helper to log and return a mock promise
const mockInvoke = async (channel: string, ...args: any[]) => {
  console.log(`[MockAPI] Invoke: ${channel}`, args);

  // Allow interactive overriding of results via console
  // e.g. window.mockResponses['cards:getAll'] = { success: true, data: [] }
  const overrides = (window as any).mockResponses || {};
  if (overrides[channel]) {
    console.log(`[MockAPI] Returning overridden response for ${channel}`);
    return overrides[channel];
  }

  // HTTP Bridge to Dev Server
  try {
    const response = await fetch("http://localhost:3001/api/ipc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, args }),
    });

    if (response.ok) {
      const result = await response.json();
      // console.log(`[MockAPI] Bridge success: ${channel}`, result);
      return result;
    }
  } catch (error) {
    // Dev server not running, fall back to default mocks
  }

  return success(null); // Default success
};

export function setupElectronMock() {
  if (window.api) return;

  console.warn("⚠️ RUNNING IN BROWSER MOCK MODE ⚠️");
  console.log("Electron APIs are being polyfilled for UI development.");

  // Mock ipcRenderer
  (window as any).ipcRenderer = {
    on: (channel: string, func: Function) => {
      console.log(`[MockIPC] Listening on ${channel}`);
    },
    once: (channel: string, func: Function) => {
      console.log(`[MockIPC] Listening once on ${channel}`);
    },
    send: (channel: string, ...args: any[]) => {
      console.log(`[MockIPC] Send ${channel}`, args);
    },
    invoke: mockInvoke,
    removeListener: (channel: string, func: Function) => {
      console.log(`[MockIPC] Removed listener for ${channel}`);
    },
  };

  // Mock API Structure matches preload.ts
  const api = {
    cards: {
      getAll: () => mockInvoke("cards:getAll"),
      getById: (id: string) => mockInvoke("cards:getById", id),
      getDueToday: () => mockInvoke("cards:getDueToday"),
      create: (card: any) => mockInvoke("cards:create", card),
      update: (id: string, updates: any) =>
        mockInvoke("cards:update", id, updates),
      remove: (id: string) => mockInvoke("cards:remove", id),
      getTopicMetadata: (pageId: string) =>
        mockInvoke("cards:getTopicMetadata", pageId),
      getWeakTopicSummaries: () => mockInvoke("cards:getWeakTopicSummaries"),
      getLowEaseTopics: () => mockInvoke("cards:getLowEaseTopics"),
      getGlobalStats: () => mockInvoke("cards:getGlobalStats"),
      getBrowserList: (filters: any, sort: any) =>
        mockInvoke("cards:getBrowserList", filters, sort),
      getBySiblings: (sourceBlockId: string) =>
        mockInvoke("cards:getBySiblings", sourceBlockId),
      findDuplicateFrontBack: () => mockInvoke("cards:findDuplicateFrontBack"),
      activate: (id: string, tier?: string, reasons?: string[]) =>
        mockInvoke("cards:activate", id, tier, reasons),
      suspend: (id: string, reason: string) =>
        mockInvoke("cards:suspend", id, reason),
      bulkActivate: (ids: string[], tier?: string, reasons?: string[]) =>
        mockInvoke("cards:bulkActivate", ids, tier, reasons),
      bulkSuspend: (ids: string[], reason: string) =>
        mockInvoke("cards:bulkSuspend", ids, reason),
      getByActivationStatus: (status: string) =>
        mockInvoke("cards:getByActivationStatus", status),
      getActiveByTopicPage: (topicPageId: string) =>
        mockInvoke("cards:getActiveByTopicPage", topicPageId),
      getDormantByTopicPage: (topicPageId: string) =>
        mockInvoke("cards:getDormantByTopicPage", topicPageId),
      checkAndSuspendLeech: (id: string) =>
        mockInvoke("cards:checkAndSuspendLeech", id),
    },
    notes: {
      getAll: () => mockInvoke("notes:getAll"),
      getById: (id: string) => mockInvoke("notes:getById", id),
      create: (note: any) => mockInvoke("notes:create", note),
      update: (id: string, updates: any) =>
        mockInvoke("notes:update", id, updates),
      remove: (id: string) => mockInvoke("notes:remove", id),
    },
    reviews: {
      log: (review: any) => mockInvoke("reviews:log", review),
      getByCard: (cardId: string) => mockInvoke("reviews:getByCard", cardId),
      schedule: (
        cardId: string,
        rating: number,
        responseTimeMs?: number,
        confidenceRating?: string,
      ) =>
        mockInvoke(
          "reviews:schedule",
          cardId,
          rating,
          responseTimeMs,
          confidenceRating,
        ),
    },
    quickCaptures: {
      getAll: () => mockInvoke("quickCaptures:getAll"),
      getByStatus: (status: string) =>
        mockInvoke("quickCaptures:getByStatus", status),
      create: (capture: any) => mockInvoke("quickCaptures:create", capture),
      update: (id: string, updates: any) =>
        mockInvoke("quickCaptures:update", id, updates),
      remove: (id: string) => mockInvoke("quickCaptures:remove", id),
    },
    connections: {
      getAll: () => mockInvoke("connections:getAll"),
      getByNote: (noteId: string) =>
        mockInvoke("connections:getByNote", noteId),
      create: (connection: any) => mockInvoke("connections:create", connection),
      remove: (id: string) => mockInvoke("connections:remove", id),
    },
    sourceItems: {
      getAll: () => mockInvoke("sourceItems:getAll"),
      getByStatus: (status: string) =>
        mockInvoke("sourceItems:getByStatus", status),
      getById: (id: string) => mockInvoke("sourceItems:getById", id),
      create: (item: any) => mockInvoke("sourceItems:create", item),
      update: (id: string, updates: any) =>
        mockInvoke("sourceItems:update", id, updates),
      delete: (id: string) => mockInvoke("sourceItems:delete", id),
      getRawPage: (sourceItemId: string) =>
        mockInvoke("sourceItems:getRawPage", sourceItemId),
      purgeRawPages: () => mockInvoke("sourceItems:purgeRawPages"),
      reparseFromRaw: (sourceItemId: string) =>
        mockInvoke("sourceItems:reparseFromRaw", sourceItemId),
      reparseAllFromRaw: (options: any) =>
        mockInvoke("sourceItems:reparseAllFromRaw", options),
      onReparseProgress: () => () => {},
      reextractMetadata: (options: any) =>
        mockInvoke("sourceItems:reextractMetadata", options),
      onReextractProgress: () => () => {},
      cancelReextract: () => mockInvoke("sourceItems:cancelReextract"),
      onNew: () => () => {},
      onAIExtraction: () => () => {},
    },
    canonicalTopics: {
      getAll: () => mockInvoke("canonicalTopics:getAll"),
      getById: (id: string) => mockInvoke("canonicalTopics:getById", id),
      getByDomain: (domain: string) =>
        mockInvoke("canonicalTopics:getByDomain", domain),
      resolveAlias: (name: string) =>
        mockInvoke("canonicalTopics:resolveAlias", name),
      createOrGet: (name: string, domain?: string) =>
        mockInvoke("canonicalTopics:createOrGet", name, domain),
      addAlias: (topicId: string, alias: string) =>
        mockInvoke("canonicalTopics:addAlias", topicId, alias),
      suggestMatches: (input: string) =>
        mockInvoke("canonicalTopics:suggestMatches", input),
      merge: (sourceId: string, targetId: string) =>
        mockInvoke("canonicalTopics:merge", sourceId, targetId),
    },
    notebookPages: {
      getAll: () => mockInvoke("notebookPages:getAll"),
      getById: (id: string) => mockInvoke("notebookPages:getById", id),
      getByTopic: (topicId: string) =>
        mockInvoke("notebookPages:getByTopic", topicId),
      create: (page: any) => mockInvoke("notebookPages:create", page),
      update: (id: string, updates: any) =>
        mockInvoke("notebookPages:update", id, updates),
      delete: (id: string) => mockInvoke("notebookPages:delete", id),
    },
    notebook: {
      getTopicsWithStats: () => mockInvoke("notebook:getTopicsWithStats"),
    },
    notebookBlocks: {
      getByPage: (pageId: string, options: any) =>
        mockInvoke("notebookBlocks:getByPage", pageId, options),
      getById: (id: string) => mockInvoke("notebookBlocks:getById", id),
      getBySourceId: (sourceId: string) =>
        mockInvoke("notebookBlocks:getBySourceId", sourceId),
      getBySource: (sourceId: string) =>
        mockInvoke("notebookBlocks:getBySource", sourceId),
      create: (block: any) => mockInvoke("notebookBlocks:create", block),
      addToAnotherTopic: (payload: any) =>
        mockInvoke("notebookBlocks:addToAnotherTopic", payload),
      update: (id: string, updates: any) =>
        mockInvoke("notebookBlocks:update", id, updates),
      toggleHighYield: (blockId: string) =>
        mockInvoke("notebookBlocks:toggleHighYield", blockId),
      delete: (id: string) => mockInvoke("notebookBlocks:delete", id),
      searchByContent: (
        query: string,
        excludeBlockId?: string,
        limit?: number,
      ) =>
        mockInvoke("notebookBlocks:searchByContent", {
          query,
          excludeBlockId,
          limit,
        }),
    },
    notebookLinks: {
      create: (link: any) => mockInvoke("notebookLinks:create", link),
      getBySourceBlock: (blockId: string) =>
        mockInvoke("notebookLinks:getBySourceBlock", blockId),
      getByTargetBlock: (blockId: string) =>
        mockInvoke("notebookLinks:getByTargetBlock", blockId),
      delete: (id: string) => mockInvoke("notebookLinks:delete", id),
    },
    smartViews: {
      getAll: () => mockInvoke("smartViews:getAll"),
      getSystem: () => mockInvoke("smartViews:getSystem"),
    },
    search: {
      query: (query: string, filter?: any) =>
        mockInvoke("search:query", query, filter),
    },
    backup: {
      list: () => mockInvoke("backup:list"),
      getLastTimestamp: () => mockInvoke("backup:getLastTimestamp"),
      create: () => mockInvoke("backup:create"),
      selectFile: () => mockInvoke("backup:selectFile"),
      restore: (filePath: string) => mockInvoke("backup:restore", filePath),
      cleanup: (retentionDays?: number) =>
        mockInvoke("backup:cleanup", retentionDays),
      onAutoComplete: () => () => {},
    },
    db: {
      status: () => mockInvoke("db:status"),
      getPath: () => mockInvoke("db:getPath"),
    },
    ai: {
      getProviderStatus: () => mockInvoke("ai:getProviderStatus"),
      extractConcepts: (content: string) =>
        mockInvoke("ai:extractConcepts", content),
      identifyTestedConcept: (sourceContent: string, sourceType: string) =>
        mockInvoke("ai:identifyTestedConcept", sourceContent, sourceType),
      analyzeCaptureContent: (content: string) =>
        mockInvoke("ai:analyzeCaptureContent", content),
      validateCard: (front: string, back: string, cardType: any) =>
        mockInvoke("ai:validateCard", front, back, cardType),
      detectMedicalList: (content: string) =>
        mockInvoke("ai:detectMedicalList", content),
      convertToVignette: (listItem: string, context: string) =>
        mockInvoke("ai:convertToVignette", listItem, context),
      generateElaboratedFeedback: (
        card: any,
        topicContext: string,
        responseTimeMs: number,
      ) =>
        mockInvoke(
          "ai:generateElaboratedFeedback",
          card,
          topicContext,
          responseTimeMs,
        ),
      suggestTags: (content: string) => mockInvoke("ai:suggestTags", content),
      findRelatedNotes: (
        content: string,
        minSimilarity?: number,
        maxResults?: number,
      ) =>
        mockInvoke("ai:findRelatedNotes", content, minSimilarity, maxResults),
      clearCache: () => mockInvoke("ai:clearCache"),
      onOllamaStatus: () => () => {},
      getOllamaModels: () => mockInvoke("ai:getOllamaModels"),
      extractFacts: (
        sourceContent: string,
        sourceType: string,
        topicContext?: string,
      ) =>
        mockInvoke("ai:extractFacts", sourceContent, sourceType, topicContext),
      generateQuiz: (
        facts: any[],
        topicContext: string,
        maxQuestions?: number,
      ) => mockInvoke("ai:generateQuiz", facts, topicContext, maxQuestions),
      gradeAnswer: (
        userAnswer: string,
        correctAnswer: string,
        acceptable: string[],
        context: string,
      ) =>
        mockInvoke(
          "ai:gradeAnswer",
          userAnswer,
          correctAnswer,
          acceptable,
          context,
        ),
      detectConfusion: (userData: any) =>
        mockInvoke("ai:detectConfusion", userData),
      analyzeFlashcard: (
        stem: string,
        user: string,
        correct: string,
        explanation: string,
        matches: string,
      ) =>
        mockInvoke(
          "ai:analyzeFlashcard",
          stem,
          user,
          correct,
          explanation,
          matches,
        ),
    },
    insights: {
      getBoardRelevance: (tags: string[]) =>
        mockInvoke("insights:getBoardRelevance", tags),
      getExamTrapBreakdown: () => mockInvoke("insights:getExamTrapBreakdown"),
      getConfusionPairs: () => mockInvoke("insights:getConfusionPairs"),
    },
    files: {
      saveImage: (data: string, mimeType: string) =>
        mockInvoke("files:saveImage", { data, mimeType }),
      importFile: (filePath: string, mimeType: string) =>
        mockInvoke("files:importFile", { filePath, mimeType }),
      openFile: (path: string) => mockInvoke("files:openFile", { path }),
      extractPdfText: (id: string, path: string) =>
        mockInvoke("files:extractPdfText", { id, path }),
      onPdfTextExtracted: () => () => {},
      getPathForFile: (file: File) => file.name, // Simple mock
    },
    settings: {
      get: (key: string) => mockInvoke("settings:get", key),
      set: (key: string, value: string) =>
        mockInvoke("settings:set", key, value),
      getParsed: (key: string, def: any) =>
        mockInvoke("settings:getParsed", key, def),
      getAll: () => mockInvoke("settings:getAll"),
    },
    capture: {
      getStatus: () => mockInvoke("capture:getStatus"),
      process: (payload: any) => mockInvoke("capture:process", payload),
      onReceived: () => () => {},
    },
    app: {
      getUserDataPath: () => mockInvoke("app:getUserDataPath"),
      reload: () => {
        console.log("[MockAPI] Reload called");
        return Promise.resolve();
      },
    },
    referenceRanges: {
      getAll: () => mockInvoke("reference-ranges:getAll"),
      search: (query: string) => mockInvoke("reference-ranges:search", query),
      getByCategory: (category: string) =>
        mockInvoke("reference-ranges:getByCategory", category),
      getCategories: () => mockInvoke("reference-ranges:getCategories"),
    },
    dev: {
      getSettings: () => mockInvoke("dev:getSettings"),
      updateSetting: (key: string, value: string) =>
        mockInvoke("dev:updateSetting", key, value),
      onAILog: () => () => {},
    },
    intakeQuiz: {
      saveAttempt: (attempt: any) =>
        mockInvoke("intakeQuiz:saveAttempt", attempt),
      getBySource: (id: string) => mockInvoke("intakeQuiz:getBySource", id),
      getByBlock: (id: string) => mockInvoke("intakeQuiz:getByBlock", id),
    },
    topicQuiz: {
      saveAttempt: (attempt: any) =>
        mockInvoke("topicQuiz:saveAttempt", attempt),
      getRecentForTopic: (id: string, days?: number) =>
        mockInvoke("topicQuiz:getRecentForTopic", id, days),
      shouldPrompt: (id: string) => mockInvoke("topicQuiz:shouldPrompt", id),
      updateLastVisited: (id: string) =>
        mockInvoke("topicQuiz:updateLastVisited", id),
      getForgottenBlockIds: (id: string, days?: number) =>
        mockInvoke("topicQuiz:getForgottenBlockIds", id, days),
    },
    confusionPatterns: {
      create: (p: any) => mockInvoke("confusionPatterns:create", p),
      increment: (a: string, b: string, t: string) =>
        mockInvoke("confusionPatterns:increment", a, b, t),
      find: (a: string, b: string) =>
        mockInvoke("confusionPatterns:find", a, b),
      getAll: () => mockInvoke("confusionPatterns:getAll"),
      getHighOccurrence: (min?: number) =>
        mockInvoke("confusionPatterns:getHighOccurrence", min),
      setDisambiguationCard: (pId: string, cId: string) =>
        mockInvoke("confusionPatterns:setDisambiguationCard", pId, cId),
    },
    knowledgeEntities: {
      getAll: () => mockInvoke("knowledge-entity:get-all"),
      getById: (id: string) => mockInvoke("knowledge-entity:get-by-id", id),
      getByType: (type: string) =>
        mockInvoke("knowledge-entity:get-by-type", type),
      getByDomain: (domain: string) =>
        mockInvoke("knowledge-entity:get-by-domain", domain),
      getChildren: (id: string) =>
        mockInvoke("knowledge-entity:get-children", id),
      getAncestors: (id: string) =>
        mockInvoke("knowledge-entity:get-ancestors", id),
      insert: (e: any) => mockInvoke("knowledge-entity:insert", e),
      update: (id: string, u: any) =>
        mockInvoke("knowledge-entity:update", id, u),
      delete: (id: string) => mockInvoke("knowledge-entity:delete", id),
      findSimilar: (t: string, th?: number) =>
        mockInvoke("knowledge-entity:find-similar", t, th),
      findExactDuplicate: (t: string, title: string) =>
        mockInvoke("knowledge-entity:find-exact-duplicate", t, title),
      setGoldenTicket: (id: string, v: string) =>
        mockInvoke("knowledge-entity:set-golden-ticket", id, v),
      revealHint: (id: string) =>
        mockInvoke("knowledge-entity:reveal-hint", id),
      search: (q: string, o: any) =>
        mockInvoke("knowledge-entity:search", q, o),
      getLinks: (id: string, d: any) =>
        mockInvoke("knowledge-entity:get-links", id, d),
      getLinkedEntities: (id: string) =>
        mockInvoke("knowledge-entity:get-linked-entities", id),
      getLinkedByType: (id: string, t: string, d: any) =>
        mockInvoke("knowledge-entity:get-linked-by-type", id, t, d),
      link: (s: string, t: string, l: string) =>
        mockInvoke("knowledge-entity:link", s, t, l),
      unlink: (id: string) => mockInvoke("knowledge-entity:unlink", id),
      linkExists: (s: string, t: string, l?: string) =>
        mockInvoke("knowledge-entity:link-exists", s, t, l),
    },
    blockTopicAssignments: {
      create: (a: any) => mockInvoke("blockTopicAssignments:create", a),
      getByBlock: (id: string) =>
        mockInvoke("blockTopicAssignments:getByBlock", id),
      getByTopicPage: (id: string) =>
        mockInvoke("blockTopicAssignments:getByTopicPage", id),
      setPrimary: (b: string, t: string) =>
        mockInvoke("blockTopicAssignments:setPrimary", b, t),
      remove: (b: string, t: string) =>
        mockInvoke("blockTopicAssignments:remove", b, t),
      bulkCreate: (b: string, t: any[], p: string) =>
        mockInvoke("blockTopicAssignments:bulkCreate", b, t, p),
      getTopicPageIds: (b: string) =>
        mockInvoke("blockTopicAssignments:getTopicPageIds", b),
    },
    claudeDev: {
      getStatus: () => mockInvoke("claudeDev:getStatus"),
      startSession: () => mockInvoke("claudeDev:startSession"),
      endSession: () => mockInvoke("claudeDev:endSession"),
      getMessages: () => mockInvoke("claudeDev:getMessages"),
      clearMessages: () => mockInvoke("claudeDev:clearMessages"),
      resetClient: () => mockInvoke("claudeDev:resetClient"),
      captureScreenshot: () => mockInvoke("claudeDev:captureScreenshot"),
      sendMessage: (c: string, o: any) =>
        mockInvoke("claudeDev:sendMessage", c, o),
      sendMessageStreaming: (c: string, o: any) =>
        mockInvoke("claudeDev:sendMessageStreaming", c, o),
      getModels: () => mockInvoke("claudeDev:getModels"),
      getModel: () => mockInvoke("claudeDev:getModel"),
      setModel: (m: string) => mockInvoke("claudeDev:setModel", m),
      getHistory: () => mockInvoke("claudeDev:getHistory"),
      loadConversation: (id: string) =>
        mockInvoke("claudeDev:loadConversation", id),
      deleteConversation: (id: string) =>
        mockInvoke("claudeDev:deleteConversation", id),
      renameConversation: (id: string, t: string) =>
        mockInvoke("claudeDev:renameConversation", id, t),
      getSessionStats: () => mockInvoke("claudeDev:getSessionStats"),
      onMessage: () => () => {},
      onChunk: () => () => {},
      onStreamEnd: () => () => {},
    },
    reloadApp: () => {
      console.log("[MockAPI] ReloadApp");
      return Promise.resolve();
    },
  };

  (window as any).api = api;
}
