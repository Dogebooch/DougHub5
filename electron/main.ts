import {
  app,
  BrowserWindow,
  Menu,
  screen,
  protocol,
  net,
  dialog,
} from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import {
  initDatabase,
  closeDatabase,
  sourceItemQueries,
  settingsQueries,
  getDbPath,
} from "./database";
import { registerIpcHandlers, processCapture } from "./ipc-handlers";
import {
  ensureBackupsDir,
  cleanupOldBackups,
  pruneBackupsToCount,
  createBackup,
} from "./backup-service";
import {
  startCaptureServer,
  stopCaptureServer,
  CapturePayload,
} from "./capture-server";
import { ensureOllamaRunning, getProviderStatus } from "./ai-service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.on("uncaughtException", (error) => {
  console.error("[Main] Uncaught Exception:", error);
  // Perform cleanup
  try {
    stopCaptureServer();
    closeDatabase();
  } catch (err) {
    console.error("[Main] Cleanup failed:", err);
  }
  app.quit();
});

process.on("unhandledRejection", (reason) => {
  console.error("[Main] Unhandled Rejection:", reason);
});

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
let splash: BrowserWindow | null = null;

const AUTO_BACKUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour (increased from 15m)
const BACKUP_RETENTION_DAYS = 7; // Keep 7 days of backups
const MAX_BACKUP_COUNT = 20; // Hard limit on total files

let autoBackupInterval: NodeJS.Timeout | null = null;

function handleFatalError(title: string, error: unknown) {
  console.error(`[Fatal Error] ${title}:`, error);
  // Close splash so it doesn't obscure the error box
  if (splash && !splash.isDestroyed()) {
    splash.close();
    splash = null;
  }
  dialog.showErrorBox(
    title,
    error instanceof Error ? error.message : String(error),
  );
  app.quit();
}

function startAutoBackup() {
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
    autoBackupInterval = null;
  }

  autoBackupInterval = setInterval(() => {
    try {
      const dbPath = getDbPath();
      if (dbPath && win && !win.isDestroyed()) {
        createBackup(dbPath);
        cleanupOldBackups(BACKUP_RETENTION_DAYS);
        pruneBackupsToCount(MAX_BACKUP_COUNT);
        const timestamp = new Date().toISOString();
        win.webContents.send("backup:auto-complete", timestamp);
      }
    } catch (error) {
      console.error("[Auto-Backup] Failed scheduled backup:", error);
    }
  }, AUTO_BACKUP_INTERVAL_MS);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createSplashWindow() {
  const splashWindow = new BrowserWindow({
    width: 340,
    height: 340,
    frame: false,
    resizable: false,
    center: true,
    show: true, // Show immediately with backgroundColor while HTML loads
    backgroundColor: "#343831",
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  splashWindow.loadFile(
    path.join(process.env.VITE_PUBLIC as string, "splash.html"),
  );

  return splashWindow;
}

const updateSplashStatus = (message: string) => {
  if (splash && !splash.isDestroyed()) {
    splash.webContents.send("splash:status", message);
  }
};

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
    icon: path.join(process.env.APP_ROOT, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      webSecurity: true,
    },
  });

  startAutoBackup();

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

  win.on("closed", () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    if (autoBackupInterval) {
      clearInterval(autoBackupInterval);
      autoBackupInterval = null;
    }
    win = null;
  });

  Menu.setApplicationMenu(null);

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());

    // Open DevTools in dev mode after page loads
    if (VITE_DEV_SERVER_URL && !process.env.DOUGHUB_NO_DEVTOOLS) {
      win.webContents.openDevTools({ mode: "right", activate: false });
    }
  });

  // F12 or Ctrl+Shift+I to toggle DevTools
  win.webContents.on("before-input-event", (event, input) => {
    const isF12 = input.key === "F12";
    const isCtrlShiftI =
      input.control && input.shift && input.key.toLowerCase() === "i";
    if (isF12 || isCtrlShiftI) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (VITE_DEV_SERVER_URL) {
    // Validate dev server URL before loading
    try {
      new URL(VITE_DEV_SERVER_URL); // Throws if malformed
      console.log(
        "[Dev Mode] Loading from Vite dev server:",
        VITE_DEV_SERVER_URL,
      );

      // Retry logic for Vite dev server (handles dependency optimization reloads)
      const loadWithRetry = async (retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            await win.loadURL(VITE_DEV_SERVER_URL);
            console.log("[Dev Mode] Successfully loaded Vite dev server");
            return;
          } catch (error: any) {
            console.warn(
              `[Dev Mode] Load attempt ${i + 1}/${retries} failed:`,
              error.message,
            );
            if (i < retries - 1) {
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              console.error(
                "[Dev Mode] Failed to load from Vite dev server after retries:",
                error,
              );
              if (splash && !splash.isDestroyed()) {
                splash.close();
                splash = null;
              }
              dialog.showErrorBox(
                "Dev Server Error",
                `Failed to load from Vite dev server at ${VITE_DEV_SERVER_URL}.\n\nError: ${error.message}\n\nMake sure 'npm run dev' is running.`,
              );
            }
          }
        }
      };

      loadWithRetry();
    } catch (urlError) {
      console.error(
        "[Dev Mode] Invalid VITE_DEV_SERVER_URL:",
        VITE_DEV_SERVER_URL,
        urlError,
      );
      // Fall back to loading dist files
      console.log("[Production Mode] Loading from built files (fallback)");
      win.loadFile(path.join(RENDERER_DIST, "index.html")).catch((error) => {
        console.error("[Production Mode] Failed to load built files:", error);
        if (splash && !splash.isDestroyed()) {
          splash.close();
          splash = null;
        }
      });
    }
  } else {
    console.log(
      "[Production Mode] Loading from built files:",
      path.join(RENDERER_DIST, "index.html"),
    );
    win.loadFile(path.join(RENDERER_DIST, "index.html")).catch((error) => {
      console.error("[Production Mode] Failed to load built files:", error);
      if (splash && !splash.isDestroyed()) {
        splash.close();
        splash = null;
      }
      dialog.showErrorBox(
        "Startup Error",
        `Failed to load application files.\n\nError: ${error.message}\n\nTry rebuilding with 'npm run build'.`,
      );
    });
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

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

function criticalError(title: string, message: string, error: unknown) {
  console.error(`[Critical] ${title}:`, error);
  if (splash && !splash.isDestroyed()) {
    splash.close();
  }
  dialog.showErrorBox(title, `${message}\n\n${error}`);
  app.quit();
}

app.whenReady().then(async () => {
  if (!gotTheLock) return;

  // Show Splash Screen first
  splash = createSplashWindow();

  // Handle app-media:// protocol
  protocol.handle("app-media", (request) => {
    try {
      const url = new URL(request.url);
      const relativePath = decodeURIComponent(url.hostname + url.pathname);
      const fullPath = path.join(app.getPath("userData"), relativePath);
      return net.fetch(pathToFileURL(fullPath).toString());
    } catch (error) {
      console.error("[Protocol Handler] Error:", error);
      return new Response("Not Found", { status: 404 });
    }
  });

  try {
    // 1. Backups
    updateSplashStatus("Checking backups...");
    await sleep(400); // Visual delay
    ensureBackupsDir();
    console.log("[Backup] Backups directory ready");
    const deleted = cleanupOldBackups(BACKUP_RETENTION_DAYS);
    if (deleted > 0) {
      console.log(`[Backup] Cleaned up ${deleted} old backup(s)`);
    }

    // 2. Database
    updateSplashStatus("Initializing database...");
    await sleep(100);
    const dbPath = path.join(app.getPath("userData"), "doughub.db");
    try {
      initDatabase(dbPath);
      console.log("[Database] Initialized successfully at:", dbPath);
    } catch (error) {
      throw new Error(`Database initialization failed: ${error}`);
    }

    // 3. Services
    updateSplashStatus("Starting services...");
    registerIpcHandlers();

    startCaptureServer(async (payload: CapturePayload) => {
      try {
        const result = await processCapture(payload);
        if (win) {
          win.webContents.send("capture:received", payload);
          const newItem = sourceItemQueries.getById(result.id);
          if (newItem) {
            win.webContents.send("sourceItems:new", newItem);
          }
        }
        return result.id;
      } catch (error) {
        console.error("[Capture Server] Auto-process failed:", error);
        if (win) {
          win.webContents.send("capture:received", { ...payload, error });
        }
        throw error;
      }
    });

    // Warm up AI in background (non-critical)
    setTimeout(async () => {
      try {
        const status = await getProviderStatus();
        if (status.isLocal && !status.isConnected) {
          console.log(
            "[AI Service] Attempting to start Ollama in background...",
          );
          await ensureOllamaRunning();
        }
      } catch (error) {
        console.warn("[AI Service] Background warmup failed:", error);
      }
    }, 2000);

    // 4. Load Visuals (Main Window)
    updateSplashStatus("Loading visuals...");
    createWindow();

    if (win) {
      win.once("ready-to-show", () => {
        // Small delay to ensure paint
        setTimeout(() => {
          if (splash && !splash.isDestroyed()) splash.close();
          if (win && !win.isDestroyed()) win.show();
        }, 500);
      });
    }
  } catch (error) {
    criticalError("Startup Error", "Failed to initialize application.", error);
  }
});

// Clean up database connection on quit
app.on("before-quit", () => {
  stopCaptureServer();
  closeDatabase();
  console.log("[Database] Connection closed");
});
