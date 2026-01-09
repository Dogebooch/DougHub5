// Card type for medical list processing
export type CardType = "standard" | "qa" | "cloze" | "vignette" | "list-cloze";

// Quick capture extraction status
export type ExtractionStatus = "pending" | "processing" | "completed";

// v2 Knowledge Bank - Source types
export type SourceType = 'qbank' | 'article' | 'pdf' | 'image' | 'audio' | 'quickcapture' | 'manual';

// v2 Knowledge Bank - Source processing status
export type SourceItemStatus = 'inbox' | 'processed' | 'curated';

export interface Card {
  id: string;
  front: string;
  back: string;
  noteId: string;
  tags: string[];
  dueDate: string;
  createdAt: string;
  // Card type fields (v2) - required to match database schema
  cardType: CardType;
  parentListId: string | null; // UUID for grouping medical list cards
  listPosition: number | null; // Order within list
  // v2 Architecture - Notebook linking
  notebookTopicPageId: string | null;
  sourceBlockId: string | null;
  aiTitle: string | null;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  cardIds: string[];
  tags: string[];
  createdAt: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  scheduledDays: number;
  elapsedDays: number;
  review: string; // ISO timestamp of review
  createdAt: string;
  // Response tracking fields (v2)
  responseTimeMs?: number | null; // Milliseconds to answer
  partialCreditScore?: number | null; // 0.0-1.0 for list partial recall
  responseTimeModifier?: number | null; // 0.85-1.15x modifier
  userAnswer?: string | null;
  userExplanation?: string | null;
}

// Quick capture for emergency capture
export interface QuickCapture {
  id: string;
  content: string;
  extractionStatus: ExtractionStatus;
  createdAt: string;
  processedAt: string | null;
}

// v2 Architecture - Knowledge Bank Layer
export interface SourceItem {
  id: string;
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
  title: string;
  rawContent: string;
  mediaPath?: string;
  tempImageData?: string; // v2: Temporary base64 data before saving to disk
  transcription?: string;
  canonicalTopicIds: string[];
  tags: string[];
  questionId?: string; // For qbank sources
  status: SourceItemStatus;
  createdAt: string;
  processedAt?: string;
  updatedAt?: string;
}

// v2 Architecture - Notebook Layer
export interface CanonicalTopic {
  id: string;
  canonicalName: string;
  aliases: string[];
  domain: string;
  parentTopicId?: string;
  createdAt: string;
}

export interface NotebookTopicPage {
  id: string;
  canonicalTopicId: string;
  cardIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotebookBlock {
  id: string;
  notebookTopicPageId: string;
  sourceItemId: string;
  content: string;
  annotations?: string;
  mediaPath?: string;
  position: number;
  cardCount: number; // v2: Number of cards generated from this block
}

export interface WeakTopicSummary {
  topicId: string; // canonicalTopicId
  topicName: string; // canonicalName
  cardCount: number; // count of struggling cards
  avgDifficulty: number; // average difficulty of struggling cards
  notebookPageId: string; // for navigation
  worstDifficulty: number;
  worstCardId: string;
  lastReviewDate: string | null;
}

// v2 Architecture - Smart Views
export type AppView =
  | "review"
  | "settings"
  | "inbox"
  | "today"
  | "queue"
  | "notebook"
  | "weak"
  | "topics"
  | "stats"
  | "knowledgebank"
  | "cards";

export interface SmartViewFilter {
  status?: string[];
  sourceType?: string[];
  topicIds?: string[];
  tags?: string[];
}

export interface SmartView {
  id: string;
  name: string;
  icon: string;
  filter: SmartViewFilter;
  sortBy: string;
  isSystem: boolean;
}

// Semantic note connection
export interface Connection {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  semanticScore: number; // 0.0-1.0
  createdAt: string;
}

// Backup info
export interface BackupInfo {
  filename: string;
  timestamp: Date;
  size: number;
}

// Database status
export interface DbStatus {
  version: number;
  cardCount: number;
  noteCount: number;
  quickCaptureCount: number;
  inboxCount: number;
  queueCount: number;
  connectionCount: number;
  weakTopicsCount: number;
}

// FSRS fields for spaced repetition (extends Card in database layer)
export interface CardFSRS {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  lastReview: string | null;
}

// Full card with FSRS fields (as stored in database)
export interface CardWithFSRS extends Card, CardFSRS {}

// Card Browser view item with computed fields
export interface CardBrowserItem extends CardWithFSRS {
  // Computed fields for browser display
  topicName: string | null; // From canonical_topics.canonicalName via JOIN
  siblingCount: number; // COUNT of cards with same sourceBlockId
  isLeech: boolean; // Computed: struggling card needing rewrite
}

// IPC result wrapper for error handling
export type IpcResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

// Rating enum matching ts-fsrs (for renderer use)
export const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const;

export type RatingValue = (typeof Rating)[keyof typeof Rating];

// FSRS schedule result returned from IPC
export interface ScheduleResult {
  card: CardWithFSRS;
  reviewLog: ReviewLog;
  intervals: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

// Search types
export type SearchFilter = 'all' | 'cards' | 'notes' | 'inbox';

export interface SearchResultItem {
  id: string;
  type: 'card' | 'note' | 'source_item';
  title: string;
  snippet: string;
  createdAt: string;
  tags?: string[];
}

export interface SearchResult {
  results: SearchResultItem[];
  counts: {
    all: number;
    cards: number;
    notes: number;
    inbox: number;
  };
  queryTimeMs: number;
}

// v2 Capture - Browser extension payload
export interface CapturePayload {
  timestamp: string;
  url: string;
  hostname: string;
  siteName: 'ACEP PeerPrep' | 'MKSAP 19';
  pageHTML: string;
  bodyText: string;
  images: {
    url: string;
    title: string;
    type: 'fancybox-gallery' | 'inline-image';
    source: 'question' | 'feedback' | 'keypoints' | 'references' | 'other';
  }[];
}

// v2 Knowledge Bank - Board Question Parsed Content
export interface BoardAnswer {
  letter: string;
  html: string;
  isCorrect: boolean;
  isUserChoice: boolean;
  peerPercent?: number;
}

export interface BoardImage {
  url: string;
  localPath: string;
  caption?: string;
  location: 'vignette' | 'explanation' | 'keypoint';
}

export interface BoardAttempt {
  attemptNumber: number;
  date: string;
  chosenAnswer: string;
  wasCorrect: boolean;
  note?: string;
}

export interface BoardQuestionContent {
  source: 'peerprep' | 'mksap';
  questionId?: string;
  category?: string;
  capturedAt: string;
  sourceUrl: string;
  vignetteHtml: string;
  questionStemHtml: string;
  answers: BoardAnswer[];
  wasCorrect: boolean;
  explanationHtml: string;
  keyPointsHtml?: string;
  images: BoardImage[];
  attempts: BoardAttempt[];
}

