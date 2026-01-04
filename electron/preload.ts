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
    schedule: (cardId: string, rating: number) =>
      ipcRenderer.invoke("reviews:schedule", cardId, rating),
    getIntervals: (cardId: string) =>
      ipcRenderer.invoke("reviews:getIntervals", cardId),
  },
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
