"use strict";
const electron = require("electron");
const api = {
  cards: {
    getAll: () => electron.ipcRenderer.invoke("cards:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("cards:getById", id),
    getDueToday: () => electron.ipcRenderer.invoke("cards:getDueToday"),
    create: (card) => electron.ipcRenderer.invoke("cards:create", card),
    update: (id, updates) => electron.ipcRenderer.invoke("cards:update", id, updates),
    remove: (id) => electron.ipcRenderer.invoke("cards:remove", id),
    getTopicMetadata: (pageId) => electron.ipcRenderer.invoke("cards:getTopicMetadata", pageId),
    getWeakTopicSummaries: () => electron.ipcRenderer.invoke("cards:getWeakTopicSummaries"),
    getBrowserList: (filters, sort) => electron.ipcRenderer.invoke("cards:getBrowserList", filters, sort),
    getBySiblings: (sourceBlockId) => electron.ipcRenderer.invoke("cards:getBySiblings", sourceBlockId),
    findDuplicateFrontBack: () => electron.ipcRenderer.invoke("cards:findDuplicateFrontBack")
  },
  notes: {
    getAll: () => electron.ipcRenderer.invoke("notes:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("notes:getById", id),
    create: (note) => electron.ipcRenderer.invoke("notes:create", note),
    update: (id, updates) => electron.ipcRenderer.invoke("notes:update", id, updates),
    remove: (id) => electron.ipcRenderer.invoke("notes:remove", id)
  },
  reviews: {
    log: (review) => electron.ipcRenderer.invoke("reviews:log", review),
    getByCard: (cardId) => electron.ipcRenderer.invoke("reviews:getByCard", cardId),
    schedule: (cardId, rating, responseTimeMs) => electron.ipcRenderer.invoke("reviews:schedule", cardId, rating, responseTimeMs)
  },
  quickCaptures: {
    getAll: () => electron.ipcRenderer.invoke("quickCaptures:getAll"),
    getByStatus: (status) => electron.ipcRenderer.invoke("quickCaptures:getByStatus", status),
    create: (capture) => electron.ipcRenderer.invoke("quickCaptures:create", capture),
    update: (id, updates) => electron.ipcRenderer.invoke("quickCaptures:update", id, updates),
    remove: (id) => electron.ipcRenderer.invoke("quickCaptures:remove", id)
  },
  connections: {
    getAll: () => electron.ipcRenderer.invoke("connections:getAll"),
    getByNote: (noteId) => electron.ipcRenderer.invoke("connections:getByNote", noteId),
    create: (connection) => electron.ipcRenderer.invoke("connections:create", connection),
    remove: (id) => electron.ipcRenderer.invoke("connections:remove", id)
  },
  sourceItems: {
    getAll: () => electron.ipcRenderer.invoke("sourceItems:getAll"),
    getByStatus: (status) => electron.ipcRenderer.invoke("sourceItems:getByStatus", status),
    getById: (id) => electron.ipcRenderer.invoke("sourceItems:getById", id),
    create: (item) => electron.ipcRenderer.invoke("sourceItems:create", item),
    update: (id, updates) => electron.ipcRenderer.invoke("sourceItems:update", id, updates),
    delete: (id) => electron.ipcRenderer.invoke("sourceItems:delete", id),
    getRawPage: (sourceItemId) => electron.ipcRenderer.invoke("sourceItems:getRawPage", sourceItemId),
    purgeRawPages: () => electron.ipcRenderer.invoke("sourceItems:purgeRawPages"),
    reparseFromRaw: (sourceItemId) => electron.ipcRenderer.invoke("sourceItems:reparseFromRaw", sourceItemId),
    reparseAllFromRaw: (options) => electron.ipcRenderer.invoke("sourceItems:reparseAllFromRaw", options),
    onReparseProgress: (callback) => {
      const handler = (_event, progress) => callback(progress);
      electron.ipcRenderer.on("sourceItems:reparseFromRaw:progress", handler);
      return () => electron.ipcRenderer.removeListener(
        "sourceItems:reparseFromRaw:progress",
        handler
      );
    },
    reextractMetadata: (options) => electron.ipcRenderer.invoke("sourceItems:reextractMetadata", options),
    onReextractProgress: (callback) => {
      const handler = (_event, progress) => callback(progress);
      electron.ipcRenderer.on("sourceItems:reextractMetadata:progress", handler);
      return () => electron.ipcRenderer.removeListener(
        "sourceItems:reextractMetadata:progress",
        handler
      );
    },
    cancelReextract: () => electron.ipcRenderer.invoke("sourceItems:cancelReextract"),
    onNew: (callback) => {
      const handler = (_event, item) => callback(item);
      electron.ipcRenderer.on("sourceItems:new", handler);
      return () => electron.ipcRenderer.removeListener("sourceItems:new", handler);
    },
    onAIExtraction: (callback) => {
      const handler = (_event, payload) => callback(payload);
      electron.ipcRenderer.on("sourceItems:aiExtraction", handler);
      return () => electron.ipcRenderer.removeListener("sourceItems:aiExtraction", handler);
    }
  },
  canonicalTopics: {
    getAll: () => electron.ipcRenderer.invoke("canonicalTopics:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("canonicalTopics:getById", id),
    getByDomain: (domain) => electron.ipcRenderer.invoke("canonicalTopics:getByDomain", domain),
    resolveAlias: (name) => electron.ipcRenderer.invoke("canonicalTopics:resolveAlias", name),
    createOrGet: (name, domain) => electron.ipcRenderer.invoke("canonicalTopics:createOrGet", name, domain),
    addAlias: (topicId, alias) => electron.ipcRenderer.invoke("canonicalTopics:addAlias", topicId, alias),
    suggestMatches: (input) => electron.ipcRenderer.invoke("canonicalTopics:suggestMatches", input),
    merge: (sourceId, targetId) => electron.ipcRenderer.invoke("canonicalTopics:merge", sourceId, targetId)
  },
  notebookPages: {
    getAll: () => electron.ipcRenderer.invoke("notebookPages:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("notebookPages:getById", id),
    create: (page) => electron.ipcRenderer.invoke("notebookPages:create", page),
    update: (id, updates) => electron.ipcRenderer.invoke("notebookPages:update", id, updates),
    delete: (id) => electron.ipcRenderer.invoke("notebookPages:delete", id)
  },
  notebookBlocks: {
    getByPage: (pageId) => electron.ipcRenderer.invoke("notebookBlocks:getByPage", pageId),
    getById: (id) => electron.ipcRenderer.invoke("notebookBlocks:getById", id),
    getBySourceId: (sourceId) => electron.ipcRenderer.invoke("notebookBlocks:getBySourceId", sourceId),
    create: (block) => electron.ipcRenderer.invoke("notebookBlocks:create", block),
    update: (id, updates) => electron.ipcRenderer.invoke("notebookBlocks:update", id, updates),
    delete: (id) => electron.ipcRenderer.invoke("notebookBlocks:delete", id)
  },
  smartViews: {
    getAll: () => electron.ipcRenderer.invoke("smartViews:getAll"),
    getSystem: () => electron.ipcRenderer.invoke("smartViews:getSystem")
  },
  search: {
    query: (query, filter) => electron.ipcRenderer.invoke("search:query", query, filter)
  },
  backup: {
    list: () => electron.ipcRenderer.invoke("backup:list"),
    create: () => electron.ipcRenderer.invoke("backup:create"),
    restore: (filename) => electron.ipcRenderer.invoke("backup:restore", filename),
    cleanup: (retentionDays) => electron.ipcRenderer.invoke("backup:cleanup", retentionDays)
  },
  db: {
    status: () => electron.ipcRenderer.invoke("db:status"),
    getPath: () => electron.ipcRenderer.invoke("db:getPath")
  },
  ai: {
    getProviderStatus: () => electron.ipcRenderer.invoke("ai:getProviderStatus"),
    extractConcepts: (content) => electron.ipcRenderer.invoke("ai:extractConcepts", content),
    validateCard: (front, back, cardType) => electron.ipcRenderer.invoke("ai:validateCard", front, back, cardType),
    detectMedicalList: (content) => electron.ipcRenderer.invoke("ai:detectMedicalList", content),
    convertToVignette: (listItem, context) => electron.ipcRenderer.invoke("ai:convertToVignette", listItem, context),
    generateCards: (blockContent, topicContext, userIntent) => electron.ipcRenderer.invoke(
      "ai:generateCards",
      blockContent,
      topicContext,
      userIntent
    ),
    generateElaboratedFeedback: (card, topicContext, responseTimeMs) => electron.ipcRenderer.invoke(
      "ai:generateElaboratedFeedback",
      card,
      topicContext,
      responseTimeMs
    ),
    suggestTags: (content) => electron.ipcRenderer.invoke("ai:suggestTags", content),
    findRelatedNotes: (content, minSimilarity, maxResults) => electron.ipcRenderer.invoke(
      "ai:findRelatedNotes",
      content,
      minSimilarity,
      maxResults
    ),
    clearCache: () => electron.ipcRenderer.invoke("ai:clearCache"),
    onOllamaStatus: (callback) => {
      const subscription = (_event, payload) => callback(payload);
      electron.ipcRenderer.on("ai:ollamaStatus", subscription);
      return () => electron.ipcRenderer.removeListener("ai:ollamaStatus", subscription);
    },
    getOllamaModels: () => electron.ipcRenderer.invoke("ai:getOllamaModels")
  },
  files: {
    saveImage: (data, mimeType) => electron.ipcRenderer.invoke("files:saveImage", { data, mimeType })
  },
  settings: {
    get: (key) => electron.ipcRenderer.invoke("settings:get", key),
    set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
    getParsed: (key, defaultValue) => electron.ipcRenderer.invoke("settings:getParsed", key, defaultValue),
    getAll: () => electron.ipcRenderer.invoke("settings:getAll")
  },
  capture: {
    process: (payload) => electron.ipcRenderer.invoke("capture:process", payload),
    onReceived: (callback) => {
      const handler = (_event, payload) => callback(payload);
      electron.ipcRenderer.on("capture:received", handler);
      return () => electron.ipcRenderer.removeListener("capture:received", handler);
    }
  },
  app: {
    getUserDataPath: () => electron.ipcRenderer.invoke("app:getUserDataPath")
  },
  referenceRanges: {
    getAll: () => electron.ipcRenderer.invoke("reference-ranges:getAll"),
    search: (query) => electron.ipcRenderer.invoke("reference-ranges:search", query),
    getByCategory: (category) => electron.ipcRenderer.invoke("reference-ranges:getByCategory", category),
    getCategories: () => electron.ipcRenderer.invoke("reference-ranges:getCategories")
  },
  reloadApp: () => electron.ipcRenderer.invoke("app:reload")
};
electron.contextBridge.exposeInMainWorld("api", api);
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(
      channel,
      (event, ...args2) => listener(event, ...args2)
    );
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
