import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerIpcHandlers } from '@electron/ipc-handlers';
import { ipcMain, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  app: {
    getPath: vi.fn(),
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn(),
  },
}));

// Mock crypto.randomUUID
vi.mock('node:crypto', () => ({
  default: {
    randomUUID: vi.fn(() => 'test-uuid-1234'),
  },
  randomUUID: vi.fn(() => 'test-uuid-1234'),
}));

describe('IPC Handlers - files:saveImage', () => {
  const mockHandlers = new Map<string, Function>();
  let tempUserData: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandlers.clear();

    // Create a real temp directory for userData to test actual file operations
    tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'doughub-test-'));
    (app.getPath as any).mockReturnValue(tempUserData);

    // Capture the handler when it's registered
    (ipcMain.handle as any).mockImplementation((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
    });

    registerIpcHandlers();
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempUserData && fs.existsSync(tempUserData)) {
      fs.rmSync(tempUserData, { recursive: true, force: true });
    }
  });

  const invokeHandler = async (channel: string, ...args: any[]) => {
    const handler = mockHandlers.get(channel);
    if (!handler) throw new Error(`Handler for ${channel} not registered`);
    return await handler({}, ...args);
  };

  it('successfully saves a PNG image to temp directory', async () => {
    const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const mimeType = 'image/png';

    const result = await invokeHandler('files:saveImage', { data: imageData, mimeType });

    expect(result.error).toBeNull();
    expect(result.data.path).toBe('images/test-uuid-1234.png');
    
    // Verify file actually exists on disk
    const expectedFilePath = path.join(tempUserData, 'images', 'test-uuid-1234.png');
    expect(fs.existsSync(expectedFilePath)).toBe(true);
    
    // Cleanup is handled by afterEach
  });

  it('creates images directory if it does not exist', async () => {
    const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const mimeType = 'image/png';

    const imagesDir = path.join(tempUserData, 'images');
    expect(fs.existsSync(imagesDir)).toBe(false);

    await invokeHandler('files:saveImage', { data: imageData, mimeType });

    expect(fs.existsSync(imagesDir)).toBe(true);
  });

  it('maps mimeTypes correctly', async () => {
    const testCases = [
      { mime: 'image/jpeg', ext: 'jpg' },
      { mime: 'image/gif', ext: 'gif' },
      { mime: 'image/webp', ext: 'webp' },
      { mime: 'image/unknown', ext: 'png' }, // Default
    ];

    for (const { mime, ext } of testCases) {
      const result = await invokeHandler('files:saveImage', { 
        data: 'data:' + mime + ';base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 
        mimeType: mime 
      });
      expect(result.data.path).toBe(`images/test-uuid-1234.${ext}`);
      expect(fs.existsSync(path.join(tempUserData, 'images', `test-uuid-1234.${ext}`))).toBe(true);
    }
  });

  it('returns error for invalid base64 data', async () => {
    const invalidData = 'not-a-data-url';
    const mimeType = 'image/png';

    const result = await invokeHandler('files:saveImage', { data: invalidData, mimeType });

    expect(result.data).toBeNull();
    expect(result.error).toBe('Invalid base64 data');
  });

  it('normalizes paths to use forward slashes even on Windows', async () => {
    const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const result = await invokeHandler('files:saveImage', { data: imageData, mimeType: 'image/png' });

    // The result should ALWAYS use forward slashes for cross-platform DB compatibility
    expect(result.data.path).toBe('images/test-uuid-1234.png');
    expect(result.data.path).not.toContain('\\');
  });
});
