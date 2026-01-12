/**
 * Electron Mocks for Vitest Testing
 * 
 * Provides mock implementations of Electron's app, ipcMain, and ipcRenderer
 * for testing main process code in isolation without launching Electron.
 */

import { vi } from 'vitest'
import path from 'path'
import os from 'os'
import fs from 'fs'

/**
 * Create a unique temporary directory for each test run
 */
export function createTempTestDir(prefix: string = 'doughub-test'): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`))
  return tempDir
}

/**
 * Mock Electron app module
 */
export const mockApp = {
  getPath: vi.fn((name: string) => {
    // Return test-specific temp directories for each path type
    const tempBase = path.join(os.tmpdir(), "doughub-test-app");
    fs.mkdirSync(tempBase, { recursive: true });

    switch (name) {
      case "userData": {
        const userDataPath = path.join(tempBase, "userData");
        fs.mkdirSync(userDataPath, { recursive: true });
        return userDataPath;
      }
      case "appData": {
        const appDataPath = path.join(tempBase, "appData");
        fs.mkdirSync(appDataPath, { recursive: true });
        return appDataPath;
      }
      case "temp":
        return os.tmpdir();
      default:
        return tempBase;
    }
  }),
  whenReady: vi.fn(() => Promise.resolve()),
  quit: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
};

/**
 * Mock IPC Main (for main process testing)
 */
export const mockIpcMain = {
  handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
    // Store handlers for testing
    mockIpcMain._handlers.set(channel, handler);
  }),
  removeHandler: vi.fn((channel: string) => {
    mockIpcMain._handlers.delete(channel);
  }),
  _handlers: new Map<string, (...args: unknown[]) => unknown>(),

  // Test helper: Invoke a handler as if from renderer
  _invokeHandler: async (channel: string, ...args: unknown[]) => {
    const handler = mockIpcMain._handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for channel: ${channel}`);
    }
    return await handler({}, ...args);
  },
};

/**
 * Mock IPC Renderer (for renderer process testing)
 */
export const mockIpcRenderer = {
  invoke: vi.fn(async (channel: string, ...args: unknown[]) => {
    // In tests, invoke the registered main process handler
    return await mockIpcMain._invokeHandler(channel, ...args);
  }),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
};

/**
 * Mock BrowserWindow
 */
export const mockBrowserWindow = vi.fn(() => ({
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  on: vi.fn(),
  webContents: {
    openDevTools: vi.fn(),
    send: vi.fn(),
  },
  show: vi.fn(),
  close: vi.fn(),
}))

/**
 * Complete Electron module mock
 */
export const electronMock = {
  app: mockApp,
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  BrowserWindow: mockBrowserWindow,
}

/**
 * Setup Electron mocks globally for all tests
 * Call this in test-setup.ts
 */
export function setupElectronMocks() {
  vi.mock('electron', () => electronMock)
}

/**
 * Reset all Electron mocks between tests
 */
export function resetElectronMocks() {
  mockApp.getPath.mockClear()
  mockApp.whenReady.mockClear()
  mockApp.quit.mockClear()
  mockIpcMain.handle.mockClear()
  mockIpcMain.removeHandler.mockClear()
  mockIpcMain._handlers.clear()
  mockIpcRenderer.invoke.mockClear()
  mockBrowserWindow.mockClear()
}

/**
 * Clean up test directories
 */
export function cleanupTempDirs() {
  const tempBase = path.join(os.tmpdir(), 'doughub-test-app')
  if (fs.existsSync(tempBase)) {
    fs.rmSync(tempBase, { recursive: true, force: true })
  }
}
