import type {
  Card,
  Note,
  ReviewLog,
  CardWithFSRS,
  IpcResult,
  ScheduleResult,
  FormattedIntervals,
  RatingValue,
  QuickDump,
  Connection,
  BackupInfo,
  DbStatus,
  ExtractionStatus,
} from "./index";

// Re-export database types for convenience
export type {
  Card,
  Note,
  ReviewLog,
  CardWithFSRS,
  IpcResult,
  ScheduleResult,
  FormattedIntervals,
  RatingValue,
  QuickDump,
  Connection,
  BackupInfo,
  DbStatus,
  ExtractionStatus,
};

// API interface exposed via preload script
export interface ElectronAPI {
  cards: {
    getAll: () => Promise<IpcResult<CardWithFSRS[]>>;
    getById: (id: string) => Promise<IpcResult<CardWithFSRS | null>>;
    getDueToday: () => Promise<IpcResult<CardWithFSRS[]>>;
    create: (card: CardWithFSRS) => Promise<IpcResult<CardWithFSRS>>;
    update: (
      id: string,
      updates: Partial<CardWithFSRS>
    ) => Promise<IpcResult<void>>;
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
    schedule: (
      cardId: string,
      rating: RatingValue
    ) => Promise<IpcResult<ScheduleResult>>;
    getIntervals: (cardId: string) => Promise<IpcResult<FormattedIntervals>>;
  };
  quickDumps: {
    getAll: () => Promise<IpcResult<QuickDump[]>>;
    getByStatus: (status: ExtractionStatus) => Promise<IpcResult<QuickDump[]>>;
    create: (dump: QuickDump) => Promise<IpcResult<QuickDump>>;
    update: (
      id: string,
      updates: Partial<QuickDump>
    ) => Promise<IpcResult<void>>;
    remove: (id: string) => Promise<IpcResult<void>>;
  };
  connections: {
    getAll: () => Promise<IpcResult<Connection[]>>;
    getByNote: (noteId: string) => Promise<IpcResult<Connection[]>>;
    create: (connection: Connection) => Promise<IpcResult<Connection>>;
    remove: (id: string) => Promise<IpcResult<void>>;
  };
  backup: {
    list: () => Promise<IpcResult<BackupInfo[]>>;
    create: () => Promise<IpcResult<string>>;
    restore: (filename: string) => Promise<IpcResult<void>>;
    cleanup: (retentionDays?: number) => Promise<IpcResult<number>>;
  };
  db: {
    status: () => Promise<IpcResult<DbStatus>>;
  };
}

// Extend the global Window interface
declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
