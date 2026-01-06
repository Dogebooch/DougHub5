import type {
  Card,
  Note,
  ReviewLog,
  CardWithFSRS,
  IpcResult,
  ScheduleResult,
  RatingValue,
  QuickCapture,
  Connection,
  BackupInfo,
  DbStatus,
  ExtractionStatus,
  SourceItem,
  SourceItemStatus,
  CanonicalTopic,
  NotebookTopicPage,
  NotebookBlock,
  SmartView,
  SearchFilter,
  SearchResult,
} from "./index";
import type {
  AIProviderStatus,
  ExtractedConcept,
  ValidationResult,
  MedicalListDetection,
  VignetteConversion,
  SemanticMatch,
} from "./ai";

// Re-export database types for convenience
export type {
  Card,
  Note,
  ReviewLog,
  CardWithFSRS,
  IpcResult,
  ScheduleResult,
  RatingValue,
  QuickCapture,
  Connection,
  BackupInfo,
  DbStatus,
  ExtractionStatus,
  SourceItem,
  SourceItemStatus,
  CanonicalTopic,
  NotebookTopicPage,
  NotebookBlock,
  SmartView,
  SearchFilter,
  SearchResult,
};

// Re-export AI types
export type {
  AIProviderStatus,
  ExtractedConcept,
  ConceptExtractionResult,
  ValidationResult,
  MedicalListDetection,
  VignetteConversion,
  SemanticMatch,
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
      rating: RatingValue,
      responseTimeMs?: number | null
    ) => Promise<IpcResult<ScheduleResult>>;
  };
  quickCaptures: {
    getAll: () => Promise<IpcResult<QuickCapture[]>>;
    getByStatus: (
      status: ExtractionStatus
    ) => Promise<IpcResult<QuickCapture[]>>;
    create: (capture: QuickCapture) => Promise<IpcResult<QuickCapture>>;
    update: (
      id: string,
      updates: Partial<QuickCapture>
    ) => Promise<IpcResult<void>>;
    remove: (id: string) => Promise<IpcResult<void>>;
  };
  connections: {
    getAll: () => Promise<IpcResult<Connection[]>>;
    getByNote: (noteId: string) => Promise<IpcResult<Connection[]>>;
    create: (connection: Connection) => Promise<IpcResult<Connection>>;
    remove: (id: string) => Promise<IpcResult<void>>;
  };
  sourceItems: {
    getAll: () => Promise<IpcResult<SourceItem[]>>;
    getByStatus: (status: SourceItemStatus) => Promise<IpcResult<SourceItem[]>>;
    getById: (id: string) => Promise<IpcResult<SourceItem | null>>;
    create: (item: SourceItem) => Promise<IpcResult<SourceItem>>;
    update: (
      id: string,
      updates: Partial<SourceItem>
    ) => Promise<IpcResult<void>>;
    delete: (id: string) => Promise<IpcResult<void>>;
  };
  canonicalTopics: {
    getAll: () => Promise<IpcResult<CanonicalTopic[]>>;
    getById: (id: string) => Promise<IpcResult<CanonicalTopic | null>>;
    getByDomain: (domain: string) => Promise<IpcResult<CanonicalTopic[]>>;
  };
  notebookPages: {
    getAll: () => Promise<IpcResult<NotebookTopicPage[]>>;
    getById: (id: string) => Promise<IpcResult<NotebookTopicPage | null>>;
    create: (page: NotebookTopicPage) => Promise<IpcResult<NotebookTopicPage>>;
    update: (
      id: string,
      updates: Partial<NotebookTopicPage>
    ) => Promise<IpcResult<void>>;
  };
  notebookBlocks: {
    getByPage: (pageId: string) => Promise<IpcResult<NotebookBlock[]>>;
    create: (block: NotebookBlock) => Promise<IpcResult<NotebookBlock>>;
    update: (
      id: string,
      updates: Partial<NotebookBlock>
    ) => Promise<IpcResult<void>>;
    delete: (id: string) => Promise<IpcResult<void>>;
  };
  smartViews: {
    getAll: () => Promise<IpcResult<SmartView[]>>;
    getSystem: () => Promise<IpcResult<SmartView[]>>;
  };
  search: {
    query: (
      query: string,
      filter?: SearchFilter
    ) => Promise<IpcResult<SearchResult>>;
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
  ai: {
    getProviderStatus: () => Promise<IpcResult<AIProviderStatus>>;
    extractConcepts: (
      content: string
    ) => Promise<IpcResult<ConceptExtractionResult>>;
    validateCard: (
      front: string,
      back: string,
      cardType: "qa" | "cloze"
    ) => Promise<IpcResult<ValidationResult>>;
    detectMedicalList: (
      content: string
    ) => Promise<IpcResult<MedicalListDetection>>;
    convertToVignette: (
      listItem: string,
      context: string
    ) => Promise<IpcResult<VignetteConversion>>;
    suggestTags: (content: string) => Promise<IpcResult<string[]>>;
    findRelatedNotes: (
      content: string,
      minSimilarity?: number,
      maxResults?: number
    ) => Promise<IpcResult<SemanticMatch[]>>;
    clearCache: () => Promise<IpcResult<void>>;
  };
  files: {
    saveImage: (
      data: string,
      mimeType: string
    ) => Promise<IpcResult<{ path: string }>>;
  };
  reloadApp: () => Promise<void>;
}

// Extend the global Window interface
declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
