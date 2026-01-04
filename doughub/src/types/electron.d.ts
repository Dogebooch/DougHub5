import type { Card, Note, ReviewLog, CardWithFSRS, IpcResult } from './index';

// Re-export database types for convenience
export type { Card, Note, ReviewLog, CardWithFSRS, IpcResult };

// API interface exposed via preload script
export interface ElectronAPI {
  cards: {
    getAll: () => Promise<IpcResult<CardWithFSRS[]>>;
    getById: (id: string) => Promise<IpcResult<CardWithFSRS | null>>;
    getDueToday: () => Promise<IpcResult<CardWithFSRS[]>>;
    create: (card: CardWithFSRS) => Promise<IpcResult<CardWithFSRS>>;
    update: (id: string, updates: Partial<CardWithFSRS>) => Promise<IpcResult<void>>;
    remove: (id: string) => Promise<IpcResult<void>>;
  };
  notes: {
    getAll: () => Promise<IpcResult<Note[]>>;
    getById: (id: string) => Promise<IpcResult<Note | null>>;
    create: (note: Note) => Promise<IpcResult<Note>>;
    update: (id: string, updates: Partial<Note>) => Promise<IpcResult<void>>;
    remove: (id: string) => Promise<IpcResult<void>>;
  };
  reviews: {
    log: (review: ReviewLog) => Promise<IpcResult<ReviewLog>>;
    getByCard: (cardId: string) => Promise<IpcResult<ReviewLog[]>>;
  };
}

// Extend the global Window interface
declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
