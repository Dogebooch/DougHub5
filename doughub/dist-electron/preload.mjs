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
