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
  LowEaseTopic,
  CardBrowserItem,
  ReferenceRange,
  NotebookLink,
  NotebookLinkType,
  TopicWithStats,
  GlobalCardStats,
  TopicQuizAttempt,
} from "./index";
import type {
  AIProviderStatus,
  ExtractedConcept,
  ConceptExtractionResult,
  ValidationResult,
  MedicalListDetection,
  VignetteConversion,
  SemanticMatch,
  CaptureAnalysisResult,
  ElaboratedFeedback,
  ExtractFactsResult,
  GenerateQuizResult,
  GradeAnswerResult,
  ExtractedFact,
} from "./ai";
import type { AILogEntry, DevSettings } from "./dev";

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
  ReferenceRange,
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
      updates: Partial<CardWithFSRS>,
    ) => Promise<IpcResult<void>>;
    remove: (id: string) => Promise<IpcResult<void>>;
    getTopicMetadata: (
      pageId: string,
    ) => Promise<IpcResult<{ name: string; cardCount: number } | null>>;
    getWeakTopicSummaries: () => Promise<IpcResult<WeakTopicSummary[]>>;
    getLowEaseTopics: () => Promise<IpcResult<LowEaseTopic[]>>;
    getGlobalStats: () => Promise<IpcResult<GlobalCardStats>>;
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
      },
    ) => Promise<IpcResult<CardBrowserItem[]>>;
    getBySiblings: (
      sourceBlockId: string,
    ) => Promise<IpcResult<CardBrowserItem[]>>;
    findDuplicateFrontBack: () => Promise<IpcResult<Card[]>>;
    activate: (
      id: string,
      tier?: string,
      reasons?: string[],
    ) => Promise<IpcResult<void>>;
    suspend: (id: string, reason: string) => Promise<IpcResult<void>>;
    bulkActivate: (
      ids: string[],
      tier?: string,
      reasons?: string[],
    ) => Promise<IpcResult<void>>;
    bulkSuspend: (ids: string[], reason: string) => Promise<IpcResult<void>>;
    getByActivationStatus: (
      status: string,
    ) => Promise<IpcResult<CardBrowserItem[]>>;
    getActiveByTopicPage: (
      topicPageId: string,
    ) => Promise<IpcResult<CardBrowserItem[]>>;
    getDormantByTopicPage: (
      topicPageId: string,
    ) => Promise<IpcResult<CardBrowserItem[]>>;
    checkAndSuspendLeech: (id: string) => Promise<IpcResult<void>>;
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
      responseTimeMs?: number | null,
      confidenceRating?: string | null,
    ) => Promise<IpcResult<ScheduleResult>>;
  };
  quickCaptures: {
    getAll: () => Promise<IpcResult<QuickCapture[]>>;
    getByStatus: (
      status: ExtractionStatus,
    ) => Promise<IpcResult<QuickCapture[]>>;
    create: (capture: QuickCapture) => Promise<IpcResult<QuickCapture>>;
    update: (
      id: string,
      updates: Partial<QuickCapture>,
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
      updates: Partial<SourceItem>,
    ) => Promise<IpcResult<void>>;
    delete: (id: string) => Promise<IpcResult<void>>;
    getRawPage: (sourceItemId: string) => Promise<IpcResult<string | null>>;
    purgeRawPages: () => Promise<IpcResult<void>>;
    reparseFromRaw: (
      sourceItemId: string,
    ) => Promise<
      IpcResult<{ success: boolean; message: string; updated?: boolean }>
    >;
    reparseAllFromRaw: (options?: {
      siteName?: "MKSAP 19" | "ACEP PeerPrep";
    }) => Promise<
      IpcResult<{
        processed: number;
        succeeded: number;
        failed: number;
        skipped: number;
      }>
    >;
    onReparseProgress: (
      callback: (progress: {
        current: number;
        total: number;
        succeeded: number;
        failed: number;
        skipped: number;
      }) => void,
    ) => () => void;
    reextractMetadata: (options?: {
      ids?: string[];
      overwrite?: boolean;
      sourceTypes?: ("qbank" | "quickcapture" | "article" | "pdf" | "all")[];
    }) => Promise<
      IpcResult<{
        processed: number;
        succeeded: number;
        failed: number;
        cancelled?: boolean;
        restored?: boolean;
      }>
    >;
    onReextractProgress: (
      callback: (progress: {
        current: number;
        total: number;
        succeeded: number;
        failed: number;
        currentItem?: string;
        status?: "running" | "cancelled" | "restoring" | "complete";
      }) => void,
    ) => () => void;
    cancelReextract: () => Promise<IpcResult<void>>;
    onNew: (callback: (item: SourceItem) => void) => () => void;
    onAIExtraction: (
      callback: (payload: {
        sourceItemId: string;
        status: "started" | "completed" | "failed";
        metadata?: {
          summary?: string;
          subject?: string;
          questionType?: string;
        };
      }) => void,
    ) => () => void;
  };
  canonicalTopics: {
    getAll: () => Promise<IpcResult<CanonicalTopic[]>>;
    getById: (id: string) => Promise<IpcResult<CanonicalTopic | null>>;
    getByDomain: (domain: string) => Promise<IpcResult<CanonicalTopic[]>>;
    resolveAlias: (name: string) => Promise<IpcResult<CanonicalTopic | null>>;
    createOrGet: (
      name: string,
      domain?: string,
    ) => Promise<IpcResult<CanonicalTopic>>;
    addAlias: (topicId: string, alias: string) => Promise<IpcResult<void>>;
    suggestMatches: (input: string) => Promise<IpcResult<CanonicalTopic[]>>;
    merge: (sourceId: string, targetId: string) => Promise<IpcResult<void>>;
  };
  notebookPages: {
    getAll: () => Promise<IpcResult<NotebookTopicPage[]>>;
    getById: (id: string) => Promise<IpcResult<NotebookTopicPage | null>>;
    getByTopic: (
      topicId: string,
    ) => Promise<IpcResult<NotebookTopicPage | null>>;
    create: (page: NotebookTopicPage) => Promise<IpcResult<NotebookTopicPage>>;
    update: (
      id: string,
      updates: Partial<NotebookTopicPage>,
    ) => Promise<IpcResult<void>>;
    delete: (id: string) => Promise<IpcResult<void>>;
  };
  notebook: {
    getTopicsWithStats: () => Promise<IpcResult<TopicWithStats[]>>;
  };
  notebookBlocks: {
    getByPage: (
      pageId: string,
      options?: { highYieldOnly?: boolean },
    ) => Promise<IpcResult<NotebookBlock[]>>;
    getById: (id: string) => Promise<IpcResult<NotebookBlock | null>>;
    getBySourceId: (
      sourceId: string,
    ) => Promise<IpcResult<NotebookBlock | null>>;
    getBySource: (
      sourceId: string,
    ) => Promise<
      IpcResult<{ block: NotebookBlock; topicName: string; pageId: string }[]>
    >;
    create: (block: NotebookBlock) => Promise<IpcResult<NotebookBlock>>;
    addToAnotherTopic: (payload: {
      sourceItemId: string;
      topicId: string;
      insight: string;
      linkToBlockId?: string;
    }) => Promise<IpcResult<NotebookBlock>>;
    update: (
      id: string,
      updates: Partial<NotebookBlock>,
    ) => Promise<IpcResult<void>>;
    toggleHighYield: (blockId: string) => Promise<IpcResult<NotebookBlock>>;
    delete: (id: string) => Promise<IpcResult<void>>;
    searchByContent: (
      query: string,
      excludeBlockId?: string,
      limit?: number,
    ) => Promise<
      IpcResult<{ block: NotebookBlock; topicName: string; excerpt: string }[]>
    >;
  };
  notebookLinks: {
    create: (
      link: Omit<NotebookLink, "id" | "createdAt">,
    ) => Promise<IpcResult<NotebookLink>>;
    getBySourceBlock: (blockId: string) => Promise<IpcResult<NotebookLink[]>>;
    getByTargetBlock: (blockId: string) => Promise<IpcResult<NotebookLink[]>>;
    delete: (id: string) => Promise<IpcResult<boolean>>;
  };
  smartViews: {
    getAll: () => Promise<IpcResult<SmartView[]>>;
    getSystem: () => Promise<IpcResult<SmartView[]>>;
  };
  search: {
    query: (
      query: string,
      filter?: SearchFilter,
    ) => Promise<IpcResult<SearchResult>>;
  };
  backup: {
    list: () => Promise<IpcResult<BackupInfo[]>>;
    getLastTimestamp: () => Promise<IpcResult<string | null>>;
    create: () => Promise<IpcResult<string>>;
    selectFile: () => Promise<IpcResult<string | null>>;
    restore: (filePath: string) => Promise<IpcResult<void>>;
    cleanup: (retentionDays?: number) => Promise<IpcResult<number>>;
    onAutoComplete: (callback: (timestamp: string) => void) => () => void;
  };
  db: {
    status: () => Promise<IpcResult<DbStatus>>;
    getPath: () => Promise<IpcResult<string | null>>;
  };
  ai: {
    getProviderStatus: () => Promise<IpcResult<AIProviderStatus>>;
    extractConcepts: (
      content: string,
    ) => Promise<IpcResult<ConceptExtractionResult>>;
    analyzeCaptureContent: (
      content: string,
    ) => Promise<IpcResult<CaptureAnalysisResult | null>>;
    validateCard: (
      front: string,
      back: string,
      cardType: "qa" | "cloze",
    ) => Promise<IpcResult<ValidationResult>>;
    detectMedicalList: (
      content: string,
    ) => Promise<IpcResult<MedicalListDetection>>;
    convertToVignette: (
      listItem: string,
      context: string,
    ) => Promise<IpcResult<VignetteConversion>>;
    generateElaboratedFeedback: (
      card: { front: string; back: string; cardType: string },
      topicContext: string,
      responseTimeMs: number | null,
    ) => Promise<IpcResult<ElaboratedFeedback>>;
    suggestTags: (content: string) => Promise<IpcResult<string[]>>;
    findRelatedNotes: (
      content: string,
      minSimilarity?: number,
      maxResults?: number,
    ) => Promise<IpcResult<SemanticMatch[]>>;
    clearCache: () => Promise<IpcResult<void>>;
    onOllamaStatus: (
      callback: (payload: {
        status: "starting" | "started" | "failed" | "already-running";
        message: string;
      }) => void,
    ) => () => void;
    getOllamaModels: () => Promise<IpcResult<string[]>>;
    // Notebook v2: Quiz System AI (v24)
    extractFacts: (
      sourceContent: string,
      sourceType: string,
      topicContext?: string,
    ) => Promise<IpcResult<ExtractFactsResult>>;
    generateQuiz: (
      facts: ExtractedFact[],
      topicContext: string,
      maxQuestions?: number,
    ) => Promise<IpcResult<GenerateQuizResult>>;
    gradeAnswer: (
      userAnswer: string,
      correctAnswer: string,
      acceptableAnswers: string[],
      questionContext: string,
    ) => Promise<IpcResult<GradeAnswerResult>>;
  };
  insights: {
    getBoardRelevance: (topicTags: string[]) => Promise<
      IpcResult<{
        questionsAttempted: number;
        correctCount: number;
        accuracy: number;
        testedConcepts: { concept: string; count: number }[];
        missedConcepts: { concept: string; sourceItemId: string }[];
      }>
    >;
    getExamTrapBreakdown: () => Promise<
      IpcResult<{ trapType: string; count: number }[]>
    >;
    getConfusionPairs: () => Promise<
      IpcResult<{ tag: string; count: number }[]>
    >;
  };
  files: {
    saveImage: (
      data: string,
      mimeType: string,
    ) => Promise<IpcResult<{ path: string }>>;
    importFile: (
      filePath: string,
      mimeType: string,
    ) => Promise<IpcResult<{ path: string }>>;
    openFile: (path: string) => Promise<IpcResult<void>>;
    extractPdfText: (
      sourceItemId: string,
      relativePath: string,
    ) => Promise<IpcResult<{ text: string; pageCount: number }>>;
    onPdfTextExtracted: (
      callback: (payload: {
        sourceItemId: string;
        textLength: number;
        pageCount: number;
      }) => void,
    ) => () => void;
    getPathForFile: (file: File) => string;
  };
  capture: {
    getStatus: () => Promise<IpcResult<{ isRunning: boolean; port: number }>>;
    process: (
      payload: CapturePayload,
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
  referenceRanges: {
    getAll: () => Promise<IpcResult<ReferenceRange[]>>;
    search: (query: string) => Promise<IpcResult<ReferenceRange[]>>;
    getByCategory: (category: string) => Promise<IpcResult<ReferenceRange[]>>;
    getCategories: () => Promise<IpcResult<string[]>>;
  };
  topicQuiz: {
    saveAttempt: (attempt: TopicQuizAttempt) => Promise<IpcResult<void>>;
    getRecentForTopic: (
      topicPageId: string,
      days?: number,
    ) => Promise<IpcResult<TopicQuizAttempt[]>>;
    shouldPrompt: (
      topicPageId: string,
    ) => Promise<IpcResult<{ shouldPrompt: boolean; daysSince: number }>>;
    updateLastVisited: (topicPageId: string) => Promise<IpcResult<void>>;
    getForgottenBlockIds: (
      topicPageId: string,
      thresholdDays?: number,
    ) => Promise<IpcResult<string[]>>;
  };
  dev: {
    getSettings: () => Promise<IpcResult<Record<string, string>>>;
    updateSetting: (key: string, value: string) => Promise<IpcResult<void>>;
    onAILog: (callback: (payload: AILogEntry) => void) => () => void;
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
