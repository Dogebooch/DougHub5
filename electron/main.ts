import { app, BrowserWindow, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initDatabase, closeDatabase } from "./database";
import { registerIpcHandlers } from "./ipc-handlers";
import { ensureBackupsDir, cleanupOldBackups } from "./backup-service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Disable default menu to prevent Ctrl+Shift+S from being captured by "Save As"
  Menu.setApplicationMenu(null);

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  // Ensure backups directory exists
  ensureBackupsDir();
  console.log("[Backup] Backups directory ready");

  // Cleanup old backups (keep 7 days by default)
  const deleted = cleanupOldBackups(7);
  if (deleted > 0) {
    console.log(`[Backup] Cleaned up ${deleted} old backup(s)`);
  }

  // Initialize SQLite database before creating window
  const dbPath = path.join(app.getPath("userData"), "doughub.db");
  initDatabase(dbPath);
  console.log("[Database] Initialized at:", dbPath);

  // Register IPC handlers for renderer communication
  registerIpcHandlers();

  // Create the main window
  createWindow();
});

// Clean up database connection on quit
app.on("before-quit", () => {
  closeDatabase();
  console.log("[Database] Connection closed");
});
