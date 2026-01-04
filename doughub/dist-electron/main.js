import { ipcMain, app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Database from "better-sqlite3";
let db = null;
function initDatabase(dbPath) {
  if (db) {
    return db;
  }
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("user_version = 1");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      noteId TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      dueDate TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      stability REAL DEFAULT 0,
      difficulty REAL DEFAULT 0,
      elapsedDays REAL DEFAULT 0,
      scheduledDays REAL DEFAULT 0,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      state INTEGER DEFAULT 0,
      lastReview TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      cardIds TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      cardId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      state INTEGER NOT NULL,
      scheduledDays REAL NOT NULL,
      elapsedDays REAL NOT NULL,
      review TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_noteId ON cards(noteId);
    CREATE INDEX IF NOT EXISTS idx_cards_dueDate ON cards(dueDate);
    CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
    CREATE INDEX IF NOT EXISTS idx_review_logs_cardId ON review_logs(cardId);
  `);
  return db;
}
function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
const cardQueries = {
  getAll() {
    const stmt = getDatabase().prepare("SELECT * FROM cards");
    const rows = stmt.all();
    return rows.map(parseCardRow);
  },
  insert(card) {
    const stmt = getDatabase().prepare(`
      INSERT INTO cards (
        id, front, back, noteId, tags, dueDate, createdAt,
        stability, difficulty, elapsedDays, scheduledDays,
        reps, lapses, state, lastReview
      ) VALUES (
        @id, @front, @back, @noteId, @tags, @dueDate, @createdAt,
        @stability, @difficulty, @elapsedDays, @scheduledDays,
        @reps, @lapses, @state, @lastReview
      )
    `);
    stmt.run({
      ...card,
      tags: JSON.stringify(card.tags)
    });
  },
  update(id, updates) {
    const current = cardQueries.getAll().find((c) => c.id === id);
    if (!current) {
      throw new Error(`Card not found: ${id}`);
    }
    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE cards SET
        front = @front,
        back = @back,
        noteId = @noteId,
        tags = @tags,
        dueDate = @dueDate,
        createdAt = @createdAt,
        stability = @stability,
        difficulty = @difficulty,
        elapsedDays = @elapsedDays,
        scheduledDays = @scheduledDays,
        reps = @reps,
        lapses = @lapses,
        state = @state,
        lastReview = @lastReview
      WHERE id = @id
    `);
    stmt.run({
      ...merged,
      tags: JSON.stringify(merged.tags)
    });
  },
  delete(id) {
    const stmt = getDatabase().prepare("DELETE FROM cards WHERE id = @id");
    stmt.run({ id });
  }
};
function parseCardRow(row) {
  return {
    ...row,
    tags: JSON.parse(row.tags)
  };
}
const noteQueries = {
  getAll() {
    const stmt = getDatabase().prepare("SELECT * FROM notes");
    const rows = stmt.all();
    return rows.map(parseNoteRow);
  },
  insert(note) {
    const stmt = getDatabase().prepare(`
      INSERT INTO notes (id, title, content, cardIds, tags, createdAt)
      VALUES (@id, @title, @content, @cardIds, @tags, @createdAt)
    `);
    stmt.run({
      ...note,
      cardIds: JSON.stringify(note.cardIds),
      tags: JSON.stringify(note.tags)
    });
  },
  update(id, updates) {
    const current = noteQueries.getAll().find((n) => n.id === id);
    if (!current) {
      throw new Error(`Note not found: ${id}`);
    }
    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE notes SET
        title = @title,
        content = @content,
        cardIds = @cardIds,
        tags = @tags,
        createdAt = @createdAt
      WHERE id = @id
    `);
    stmt.run({
      ...merged,
      cardIds: JSON.stringify(merged.cardIds),
      tags: JSON.stringify(merged.tags)
    });
  },
  delete(id) {
    const stmt = getDatabase().prepare("DELETE FROM notes WHERE id = @id");
    stmt.run({ id });
  }
};
function parseNoteRow(row) {
  return {
    ...row,
    cardIds: JSON.parse(row.cardIds),
    tags: JSON.parse(row.tags)
  };
}
const reviewLogQueries = {
  getAll() {
    const stmt = getDatabase().prepare("SELECT * FROM review_logs ORDER BY createdAt DESC");
    const rows = stmt.all();
    return rows;
  },
  insert(log) {
    const stmt = getDatabase().prepare(`
      INSERT INTO review_logs (
        id, cardId, rating, state, scheduledDays, elapsedDays, review, createdAt
      ) VALUES (
        @id, @cardId, @rating, @state, @scheduledDays, @elapsedDays, @review, @createdAt
      )
    `);
    stmt.run(log);
  }
};
function success(data) {
  return { data, error: null };
}
function failure(error) {
  const message = error instanceof Error ? error.message : String(error);
  return { data: null, error: message };
}
function registerIpcHandlers() {
  ipcMain.handle("cards:getAll", async () => {
    try {
      const cards = cardQueries.getAll();
      return success(cards);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("cards:getById", async (_, id) => {
    try {
      const cards = cardQueries.getAll();
      const card = cards.find((c) => c.id === id) ?? null;
      return success(card);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("cards:getDueToday", async () => {
    try {
      const cards = cardQueries.getAll();
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dueCards = cards.filter((c) => c.dueDate <= today);
      return success(dueCards);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("cards:create", async (_, card) => {
    try {
      cardQueries.insert(card);
      return success(card);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("cards:update", async (_, id, updates) => {
    try {
      cardQueries.update(id, updates);
      return success(void 0);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("cards:remove", async (_, id) => {
    try {
      cardQueries.delete(id);
      return success(void 0);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("notes:getAll", async () => {
    try {
      const notes = noteQueries.getAll();
      return success(notes);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("notes:getById", async (_, id) => {
    try {
      const notes = noteQueries.getAll();
      const note = notes.find((n) => n.id === id) ?? null;
      return success(note);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("notes:create", async (_, note) => {
    try {
      noteQueries.insert(note);
      return success(note);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("notes:update", async (_, id, updates) => {
    try {
      noteQueries.update(id, updates);
      return success(void 0);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("notes:remove", async (_, id) => {
    try {
      noteQueries.delete(id);
      return success(void 0);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("reviews:log", async (_, log) => {
    try {
      reviewLogQueries.insert(log);
      return success(log);
    } catch (error) {
      return failure(error);
    }
  });
  ipcMain.handle("reviews:getByCard", async (_, cardId) => {
    try {
      const allLogs = reviewLogQueries.getAll();
      const cardLogs = allLogs.filter((log) => log.cardId === cardId);
      return success(cardLogs);
    } catch (error) {
      return failure(error);
    }
  });
  console.log("[IPC] All handlers registered");
}
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  const dbPath = path.join(app.getPath("userData"), "doughub.db");
  initDatabase(dbPath);
  console.log("[Database] Initialized at:", dbPath);
  registerIpcHandlers();
  createWindow();
});
app.on("before-quit", () => {
  closeDatabase();
  console.log("[Database] Connection closed");
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
