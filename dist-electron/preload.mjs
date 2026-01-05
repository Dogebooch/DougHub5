"use strict";
const electron = require("electron");
const api = {
  cards: {
    getAll: () => electron.ipcRenderer.invoke("cards:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("cards:getById", id),
    getDueToday: () => electron.ipcRenderer.invoke("cards:getDueToday"),
    create: (card) => electron.ipcRenderer.invoke("cards:create", card),
    update: (id, updates) => electron.ipcRenderer.invoke("cards:update", id, updates),
    remove: (id) => electron.ipcRenderer.invoke("cards:remove", id)
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
    schedule: (cardId, rating) => electron.ipcRenderer.invoke("reviews:schedule", cardId, rating),
    getIntervals: (cardId) => electron.ipcRenderer.invoke("reviews:getIntervals", cardId)
  },
  quickDumps: {
    getAll: () => electron.ipcRenderer.invoke("quickDumps:getAll"),
    getByStatus: (status) => electron.ipcRenderer.invoke("quickDumps:getByStatus", status),
    create: (dump) => electron.ipcRenderer.invoke("quickDumps:create", dump),
    update: (id, updates) => electron.ipcRenderer.invoke("quickDumps:update", id, updates),
    remove: (id) => electron.ipcRenderer.invoke("quickDumps:remove", id)
  },
  connections: {
    getAll: () => electron.ipcRenderer.invoke("connections:getAll"),
    getByNote: (noteId) => electron.ipcRenderer.invoke("connections:getByNote", noteId),
    create: (connection) => electron.ipcRenderer.invoke("connections:create", connection),
    remove: (id) => electron.ipcRenderer.invoke("connections:remove", id)
  },
  backup: {
    list: () => electron.ipcRenderer.invoke("backup:list"),
    create: () => electron.ipcRenderer.invoke("backup:create"),
    restore: (filename) => electron.ipcRenderer.invoke("backup:restore", filename),
    cleanup: (retentionDays) => electron.ipcRenderer.invoke("backup:cleanup", retentionDays)
  },
  db: {
    status: () => electron.ipcRenderer.invoke("db:status")
  },
  ai: {
    getProviderStatus: () => electron.ipcRenderer.invoke("ai:getProviderStatus"),
    extractConcepts: (content) => electron.ipcRenderer.invoke("ai:extractConcepts", content),
    validateCard: (front, back, cardType) => electron.ipcRenderer.invoke("ai:validateCard", front, back, cardType),
    detectMedicalList: (content) => electron.ipcRenderer.invoke("ai:detectMedicalList", content),
    convertToVignette: (listItem, context) => electron.ipcRenderer.invoke("ai:convertToVignette", listItem, context),
    suggestTags: (content) => electron.ipcRenderer.invoke("ai:suggestTags", content),
    findRelatedNotes: (content, minSimilarity, maxResults) => electron.ipcRenderer.invoke(
      "ai:findRelatedNotes",
      content,
      minSimilarity,
      maxResults
    ),
    clearCache: () => electron.ipcRenderer.invoke("ai:clearCache")
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
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
