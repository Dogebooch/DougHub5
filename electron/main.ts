import { app, BrowserWindow, Menu, screen, protocol, net } from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import {
  initDatabase,
  closeDatabase,
  sourceItemQueries,
  settingsQueries,
} from "./database";
import { registerIpcHandlers, processCapture } from "./ipc-handlers";
import { ensureBackupsDir, cleanupOldBackups } from "./backup-service";
import {
  startCaptureServer,
  stopCaptureServer,
  CapturePayload,
} from "./capture-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register app-media protocol to allow loading local images securely
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
    },
  },
]);

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
  const displays = screen.getAllDisplays();

  // Try to load saved bounds from database
  const savedBounds = settingsQueries.getParsed("window:bounds", null) as {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;

  // Default dimensions (increased as requested)
  const defaultWidth = 1600;
  const defaultHeight = 1000;

  let x: number | undefined;
  let y: number | undefined;
  let width = defaultWidth;
  let height = defaultHeight;

  if (savedBounds) {
    // Validate that the saved bounds are still within the current display layout
    const isVisible = displays.some((display) => {
      const b = display.bounds;
      // Must overlap significantly
      return (
        savedBounds.x < b.x + b.width &&
        savedBounds.x + savedBounds.width > b.x &&
        savedBounds.y < b.y + b.height &&
        savedBounds.y + savedBounds.height > b.y
      );
    });

    if (isVisible) {
      x = savedBounds.x;
      y = savedBounds.y;
      width = savedBounds.width;
      height = savedBounds.height;
    }
  }

  // Fallback to primary/secondary centering logic if no valid saved bounds
  if (x === undefined || y === undefined) {
    // Prefer a non-primary screen if multiple exist
    const primaryDisplay = screen.getPrimaryDisplay();
    const targetDisplay =
      displays.find((d) => d.id !== primaryDisplay.id) || primaryDisplay;

    const {
      width: displayWidth,
      height: displayHeight,
      x: displayX,
      y: displayY,
    } = targetDisplay.bounds;

    x = displayX + (displayWidth - width) / 2;
    y = displayY + (displayHeight - height) / 2;
  }

  win = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      webSecurity: true,
    },
  });

  // Persist window state changes with debounce
  let saveTimeout: NodeJS.Timeout | null = null;
  const saveBounds = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (win) {
        const bounds = win.getBounds();
        settingsQueries.set("window:bounds", JSON.stringify(bounds));
      }
    }, 1000); // 1s debounce to avoid heavy DB writes
  };

  win.on("move", saveBounds);
  win.on("resize", saveBounds);

  Menu.setApplicationMenu(null);

  win.once("ready-to-show", () => {
    win?.showInactive();
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    // Open DevTools in development for debugging, but don't steal focus
    win.webContents.openDevTools({ mode: "detach", activate: false });
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
  // Handle app-media:// protocol
  protocol.handle("app-media", (request) => {
    try {
      const url = new URL(request.url);
      // On Windows, the path might start with / followed by a disk letter or just a path
      // request.url is "app-media://images/abc.png"
      // we want "images/abc.png"
      const relativePath = decodeURIComponent(url.hostname + url.pathname);
      const fullPath = path.join(app.getPath("userData"), relativePath);
      return net.fetch(pathToFileURL(fullPath).toString());
    } catch (error) {
      console.error("[Protocol Handler] Error:", error);
      return new Response("Not Found", { status: 404 });
    }
  });

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
  try {
    initDatabase(dbPath);
    console.log("[Database] Initialized successfully at:", dbPath);
  } catch (error) {
    console.error("[Database] CRITICAL: Failed to initialize database:", error);
    // Continue anyway - IPC handlers will fail gracefully with error responses
  }

  // Register IPC handlers for renderer communication
  registerIpcHandlers();

  // Start the Capture Server for browser extension captures
  startCaptureServer(async (payload: CapturePayload) => {
    try {
      // Auto-process the capture in the background
      const result = await processCapture(payload);

      // Notify renderer of the new capture (for UI refresh if open)
      if (win) {
        win.webContents.send("capture:received", payload);
        // Also send sourceItems:new to refresh lists
        const newItem = sourceItemQueries.getById(result.id);
        if (newItem) {
          win.webContents.send("sourceItems:new", newItem);
        }
      }

      return result.id;
    } catch (error) {
      console.error("[Capture Server] Auto-process failed:", error);
      // Still notify renderer even on failure so it can show an error
      if (win) {
        win.webContents.send("capture:received", { ...payload, error });
      }
      throw error;
    }
  });

  // Create the main window
  createWindow();
});

// Clean up database connection on quit
app.on("before-quit", () => {
  stopCaptureServer();
  closeDatabase();
  console.log("[Database] Connection closed");
});
