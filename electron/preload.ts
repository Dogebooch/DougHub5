import { ipcRenderer, contextBridge } from 'electron'

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
      responseTimeMs?: number | null
    ) => ipcRenderer.invoke("reviews:schedule", cardId, rating, responseTimeMs),
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
  },
  notebookPages: {
    getAll: () => ipcRenderer.invoke("notebookPages:getAll"),
    getById: (id: string) => ipcRenderer.invoke("notebookPages:getById", id),
    create: (page: unknown) => ipcRenderer.invoke("notebookPages:create", page),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke("notebookPages:update", id, updates),
  },
  notebookBlocks: {
    getByPage: (pageId: string) =>
      ipcRenderer.invoke("notebookBlocks:getByPage", pageId),
    create: (block: unknown) =>
      ipcRenderer.invoke("notebookBlocks:create", block),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke("notebookBlocks:update", id, updates),
    delete: (id: string) => ipcRenderer.invoke("notebookBlocks:delete", id),
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
    create: () => ipcRenderer.invoke("backup:create"),
    restore: (filename: string) =>
      ipcRenderer.invoke("backup:restore", filename),
    cleanup: (retentionDays?: number) =>
      ipcRenderer.invoke("backup:cleanup", retentionDays),
  },
  db: {
    status: () => ipcRenderer.invoke("db:status"),
  },
  ai: {
    getProviderStatus: () => ipcRenderer.invoke("ai:getProviderStatus"),
    extractConcepts: (content: string) =>
      ipcRenderer.invoke("ai:extractConcepts", content),
    validateCard: (front: string, back: string, cardType: "qa" | "cloze") =>
      ipcRenderer.invoke("ai:validateCard", front, back, cardType),
    detectMedicalList: (content: string) =>
      ipcRenderer.invoke("ai:detectMedicalList", content),
    convertToVignette: (listItem: string, context: string) =>
      ipcRenderer.invoke("ai:convertToVignette", listItem, context),
    suggestTags: (content: string) =>
      ipcRenderer.invoke("ai:suggestTags", content),
    findRelatedNotes: (
      content: string,
      minSimilarity?: number,
      maxResults?: number
    ) =>
      ipcRenderer.invoke(
        "ai:findRelatedNotes",
        content,
        minSimilarity,
        maxResults
      ),
    clearCache: () => ipcRenderer.invoke("ai:clearCache"),
    onOllamaStatus: (
      callback: (payload: { status: string; message: string }) => void
    ) => {
      const subscription = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on("ai:ollamaStatus", subscription);
      return () => ipcRenderer.removeListener("ai:ollamaStatus", subscription);
    },
  },
  files: {
    saveImage: (data: string, mimeType: string) =>
      ipcRenderer.invoke("files:saveImage", { data, mimeType }),
  },
  reloadApp: () => ipcRenderer.invoke("app:reload"),
};

// Expose typed API to renderer
contextBridge.exposeInMainWorld('api', api)

// Keep legacy ipcRenderer for backwards compatibility during migration
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})
