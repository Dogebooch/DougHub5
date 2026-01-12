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
  WeakTopicSummary,
  CardBrowserItem,
} from "./index";
import type {
  AIProviderStatus,
  ExtractedConcept,
  ValidationResult,
  MedicalListDetection,
  VignetteConversion,
  SemanticMatch,
  CardSuggestion,
  ElaboratedFeedback,
} from "./ai";

export interface CapturePayload {
  timestamp: string;
  url: string;
  hostname: string;
  siteName: "ACEP PeerPrep" | "MKSAP 19";
  pageHTML: string;
  bodyText: string;
  images: {
    url: string;
    title: string;
    type: "fancybox-gallery" | "inline-image";
    source: "question" | "feedback" | "keypoints" | "references" | "other";
  }[];
}

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
    getTopicMetadata: (
      pageId: string
    ) => Promise<IpcResult<{ name: string; cardCount: number } | null>>;
    getWeakTopicSummaries: () => Promise<IpcResult<WeakTopicSummary[]>>;
    getBrowserList: (
      filters?: {
        status?: number[];
        topicId?: string;
        tags?: string[];
        leechesOnly?: boolean;
        search?: string;
      },
      sort?: {
        field: "dueDate" | "createdAt" | "difficulty" | "lastReview";
        direction: "asc" | "desc";
      }
    ) => Promise<IpcResult<CardBrowserItem[]>>;
    getBySiblings: (
      sourceBlockId: string
    ) => Promise<IpcResult<CardBrowserItem[]>>;
    getBySiblings: (
      sourceBlockId: string
    ) => Promise<IpcResult<CardBrowserItem[]>>;
    findDuplicateFrontBack: () => Promise<IpcResult<Card[]>>;
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
    getRawPage: (sourceItemId: string) => Promise<IpcResult<string | null>>;
    purgeRawPages: () => Promise<IpcResult<void>>;
    onNew: (callback: (item: SourceItem) => void) => () => void;
  };
  canonicalTopics: {
    getAll: () => Promise<IpcResult<CanonicalTopic[]>>;
    getById: (id: string) => Promise<IpcResult<CanonicalTopic | null>>;
    getByDomain: (domain: string) => Promise<IpcResult<CanonicalTopic[]>>;
    resolveAlias: (name: string) => Promise<IpcResult<CanonicalTopic | null>>;
    createOrGet: (
      name: string,
      domain?: string
    ) => Promise<IpcResult<CanonicalTopic>>;
    addAlias: (topicId: string, alias: string) => Promise<IpcResult<void>>;
    suggestMatches: (input: string) => Promise<IpcResult<CanonicalTopic[]>>;
    merge: (sourceId: string, targetId: string) => Promise<IpcResult<void>>;
  };
  notebookPages: {
    getAll: () => Promise<IpcResult<NotebookTopicPage[]>>;
    getById: (id: string) => Promise<IpcResult<NotebookTopicPage | null>>;
    create: (page: NotebookTopicPage) => Promise<IpcResult<NotebookTopicPage>>;
    update: (
      id: string,
      updates: Partial<NotebookTopicPage>
    ) => Promise<IpcResult<void>>;
    delete: (id: string) => Promise<IpcResult<void>>;
  };
  notebookBlocks: {
    getByPage: (pageId: string) => Promise<IpcResult<NotebookBlock[]>>;
    getById: (id: string) => Promise<IpcResult<NotebookBlock | null>>;
    getBySourceId: (
      sourceId: string
    ) => Promise<IpcResult<NotebookBlock | null>>;
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
    getPath: () => Promise<IpcResult<string | null>>;
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
    generateCards: (
      blockContent: string,
      topicContext: string,
      userIntent?: string
    ) => Promise<IpcResult<CardSuggestion[]>>;
    generateElaboratedFeedback: (
      card: { front: string; back: string; cardType: string },
      topicContext: string,
      responseTimeMs: number | null
    ) => Promise<IpcResult<ElaboratedFeedback>>;
    suggestTags: (content: string) => Promise<IpcResult<string[]>>;
    findRelatedNotes: (
      content: string,
      minSimilarity?: number,
      maxResults?: number
    ) => Promise<IpcResult<SemanticMatch[]>>;
    clearCache: () => Promise<IpcResult<void>>;
    onOllamaStatus: (
      callback: (payload: {
        status: "starting" | "started" | "failed" | "already-running";
        message: string;
      }) => void
    ) => () => void;
    getOllamaModels: () => Promise<IpcResult<string[]>>;
  };
  files: {
    saveImage: (
      data: string,
      mimeType: string
    ) => Promise<IpcResult<{ path: string }>>;
  };
  capture: {
    process: (
      payload: CapturePayload
    ) => Promise<IpcResult<{ id: string; isUpdate: boolean }>>;
    onReceived: (callback: (payload: CapturePayload) => void) => () => void;
  };
  app: {
    getUserDataPath: () => Promise<IpcResult<string>>;
  };
  settings: {
    get: (key: string) => Promise<IpcResult<string | null>>;
    set: (key: string, value: string) => Promise<IpcResult<void>>;
    getParsed: <T>(key: string, defaultValue: T) => Promise<IpcResult<T>>;
    getAll: () => Promise<IpcResult<{ key: string; value: string }[]>>;
  };
  db: {
    getPath: () => Promise<IpcResult<string>>;
  };
  reloadApp: () => Promise<void>;
}

// Extend the global Window interface
declare global {
  interface Window {
    api: ElectronAPI;
    ipcRenderer: {
      on(channel: string, func: (...args: unknown[]) => void): void;
      once(channel: string, func: (...args: unknown[]) => void): void;
      send(...args: unknown[]): void;
      invoke(...args: unknown[]): Promise<unknown>;
    };
  }
}

export {};
