import { ipcMain } from 'electron';
import { cardQueries, noteQueries, reviewLogQueries, DbCard, DbNote, DbReviewLog } from './database';

// ============================================================================
// IPC Result Wrapper
// ============================================================================

type IpcResult<T> = { data: T; error: null } | { data: null; error: string };

function success<T>(data: T): IpcResult<T> {
  return { data, error: null };
}

function failure(error: unknown): IpcResult<never> {
  const message = error instanceof Error ? error.message : String(error);
  return { data: null, error: message };
}

// ============================================================================
// Register All IPC Handlers
// ============================================================================

export function registerIpcHandlers(): void {
  // --------------------------------------------------------------------------
  // Card Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle('cards:getAll', async (): Promise<IpcResult<DbCard[]>> => {
    try {
      const cards = cardQueries.getAll();
      return success(cards);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('cards:getById', async (_, id: string): Promise<IpcResult<DbCard | null>> => {
    try {
      const cards = cardQueries.getAll();
      const card = cards.find((c) => c.id === id) ?? null;
      return success(card);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('cards:getDueToday', async (): Promise<IpcResult<DbCard[]>> => {
    try {
      const cards = cardQueries.getAll();
      const today = new Date().toISOString().split('T')[0];
      const dueCards = cards.filter((c) => c.dueDate <= today);
      return success(dueCards);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('cards:create', async (_, card: DbCard): Promise<IpcResult<DbCard>> => {
    try {
      cardQueries.insert(card);
      return success(card);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('cards:update', async (_, id: string, updates: Partial<DbCard>): Promise<IpcResult<void>> => {
    try {
      cardQueries.update(id, updates);
      return success(undefined);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('cards:remove', async (_, id: string): Promise<IpcResult<void>> => {
    try {
      cardQueries.delete(id);
      return success(undefined);
    } catch (error) {
      return failure(error);
    }
  });

  // --------------------------------------------------------------------------
  // Note Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle('notes:getAll', async (): Promise<IpcResult<DbNote[]>> => {
    try {
      const notes = noteQueries.getAll();
      return success(notes);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('notes:getById', async (_, id: string): Promise<IpcResult<DbNote | null>> => {
    try {
      const notes = noteQueries.getAll();
      const note = notes.find((n) => n.id === id) ?? null;
      return success(note);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('notes:create', async (_, note: DbNote): Promise<IpcResult<DbNote>> => {
    try {
      noteQueries.insert(note);
      return success(note);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('notes:update', async (_, id: string, updates: Partial<DbNote>): Promise<IpcResult<void>> => {
    try {
      noteQueries.update(id, updates);
      return success(undefined);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('notes:remove', async (_, id: string): Promise<IpcResult<void>> => {
    try {
      noteQueries.delete(id);
      return success(undefined);
    } catch (error) {
      return failure(error);
    }
  });

  // --------------------------------------------------------------------------
  // Review Log Handlers
  // --------------------------------------------------------------------------

  ipcMain.handle('reviews:log', async (_, log: DbReviewLog): Promise<IpcResult<DbReviewLog>> => {
    try {
      reviewLogQueries.insert(log);
      return success(log);
    } catch (error) {
      return failure(error);
    }
  });

  ipcMain.handle('reviews:getByCard', async (_, cardId: string): Promise<IpcResult<DbReviewLog[]>> => {
    try {
      const allLogs = reviewLogQueries.getAll();
      const cardLogs = allLogs.filter((log) => log.cardId === cardId);
      return success(cardLogs);
    } catch (error) {
      return failure(error);
    }
  });

  console.log('[IPC] All handlers registered');
}
