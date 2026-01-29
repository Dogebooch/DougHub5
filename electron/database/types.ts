/**
 * Database Type Definitions
 * 
 * All TypeScript interfaces and types for the database layer.
 * Separated from database.ts for better maintainability and AI comprehension.
 */

import {
  NotebookBlockAiEvaluation,
  RelevanceScore,
} from "../../src/types/index";

export type { NotebookBlockAiEvaluation, RelevanceScore };

// ============================================================================
// Enums and String Literal Types
// ============================================================================

export type CardType = "standard" | "qa" | "cloze" | "vignette" | "list-cloze";
export type ExtractionStatus = "pending" | "processing" | "completed";
export type SourceType =
  | "qbank"
  | "article"
  | "pdf"
  | "image"
  | "audio"
  | "quickcapture"
  | "manual";
export type SourceItemStatus = "inbox" | "processed" | "curated";

export type CorrectnessType = "correct" | "incorrect" | null;
export type ConfidenceRating = "forgot" | "struggled" | "knew_it";

// Notebook v2: Card Activation System
export type ActivationStatus = "dormant" | "suggested" | "active" | "suspended" | "graduated";
export type ActivationTier = "auto" | "suggested" | "user_manual";
export type SuspendReason = "user" | "leech" | "rotation_end";

// Notebook v2: Intake Quiz
export type IntakeQuizResult = "correct" | "wrong" | "skipped";

// Notebook Links (v17)
export type NotebookLinkType =
  | "same_concept"
  | "related_topic"
  | "cross_specialty"
  | "comparison"
  | "builds_on";

// ============================================================================
// Public Database Interfaces
// ============================================================================

export interface DbCard {
  id: string;
  front: string;
  back: string;
  noteId: string;
  tags: string[]; // Stored as JSON in DB
  dueDate: string;
  createdAt: string;
  // FSRS fields
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  lastReview: string | null;
  // Card type fields (v2)
  cardType: CardType;
  parentListId: string | null; // UUID for grouping medical list cards
  listPosition: number | null; // Order within list
  notebookTopicPageId: string | null;
  sourceBlockId: string | null;
  aiTitle: string | null;
  // Data Logging Framework (v18)
  targetedConfusion?: string; // e.g., "Methotrexate vs Methylnaltrexone"
  relevanceScore?: "high" | "medium" | "low" | "unknown";
  relevanceReason?: string; // e.g., "Targets your weak area"
  // Notebook v2: Card Activation (v24)
  activationStatus: ActivationStatus;
  activationTier?: ActivationTier;
  activationReasons?: string[]; // Stored as JSON in DB
  activatedAt?: string;
  suspendReason?: SuspendReason;
  suspendedAt?: string;
}

export interface DbNote {
  id: string;
  title: string;
  content: string;
  cardIds: string[]; // Stored as JSON in DB
  tags: string[]; // Stored as JSON in DB
  createdAt: string;
}

export interface DbReviewLog {
  id: string;
  cardId: string;
  rating: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: number;
  scheduledDays: number;
  elapsedDays: number;
  review: string;
  createdAt: string;
  // Response tracking fields (v2)
  responseTimeMs: number | null; // Milliseconds to answer
  partialCreditScore: number | null; // 0.0-1.0 for list partial recall
  responseTimeModifier: number | null; // 0.85-1.15x modifier (v7)
  userAnswer: string | null; // Prep for F18 Typed Answer Mode (v9)
  userExplanation: string | null; // Prep for F20 Exam Trap Detection (v9)
  // Data Logging Framework (v18)
  confidenceRating?: ConfidenceRating;
}

export interface DbQuickCapture {
  id: string;
  content: string;
  extractionStatus: ExtractionStatus;
  createdAt: string;
  processedAt: string | null;
}

export interface DbConnection {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  semanticScore: number; // 0.0-1.0
  createdAt: string;
}

export interface DbSourceItem {
  id: string;
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
  title: string;
  rawContent: string;
  mediaPath?: string;
  tempImageData?: string;
  transcription?: string;
  canonicalTopicIds: string[];
  tags: string[];
  questionId?: string;
  metadata?: {
    summary?: string;
    subject?: string;
    questionType?: string; // Silent metadata for card generation AI (not shown in UI)
    extractedAt?: string;
  };
  status: SourceItemStatus;
  createdAt: string;
  processedAt?: string;
  updatedAt?: string;
  // Data Logging Framework (v18)
  correctness?: "correct" | "incorrect" | null;
  notes?: string;
  testedConcepts?: string[]; // JSON array of testable concepts
}

export interface DbCanonicalTopic {
  id: string;
  canonicalName: string;
  aliases: string[];
  domain: string;
  parentTopicId?: string;
  createdAt: string;
}

export interface DbNotebookTopicPage {
  id: string;
  canonicalTopicId: string;
  cardIds: string[];
  createdAt: string;
  updatedAt: string;
  // Notebook v2: Topic Entry Quiz tracking (v24)
  lastVisitedAt?: string;
}

export interface DbNotebookBlock {
  id: string;
  notebookTopicPageId: string;
  sourceItemId: string | null; // null for direct authoring (not extracted from Library)
  content: string;
  annotations?: string;
  mediaPath?: string;
  position: number;
  cardCount: number;
  // New AI evaluation fields (v16)
  userInsight?: string;
  aiEvaluation?: NotebookBlockAiEvaluation;
  relevanceScore?: RelevanceScore;
  relevanceReason?: string;
  // v20: Callout types for card generation priority
  calloutType?: "pearl" | "trap" | "caution" | null;
  // v22: High yield toggle for board prep filtering
  isHighYield: boolean;
  // Notebook v2: Intake Quiz tracking (v24)
  intakeQuizResult?: IntakeQuizResult;
  intakeQuizAnswer?: string;
  priorityScore: number;
  priorityReasons?: string[]; // Stored as JSON in DB
}

export interface DbNotebookLink {
  id: string;
  sourceBlockId: string;
  targetBlockId: string;
  linkType: NotebookLinkType;
  reason?: string;
  anchorText?: string;
  anchorStart?: number;
  anchorEnd?: number;
  createdAt: string;
}

export interface DbMedicalAcronym {
  id?: number;
  acronym: string;
  expansion: string;
  category?: string;
}

// ============================================================================
// Notebook v2: New Table Interfaces (v24)
// ============================================================================

export interface DbBlockTopicAssignment {
  id: string;
  blockId: string;
  topicPageId: string;
  isPrimaryTopic: boolean;
  createdAt: string;
}

export interface DbIntakeQuizAttempt {
  id: string;
  sourceItemId: string;
  notebookTopicPageId: string;
  blockId: string;
  questionText: string;
  userAnswer?: string;
  isCorrect?: boolean;
  wasSkipped: boolean;
  attemptedAt: string;
}

export interface DbTopicQuizAttempt {
  id: string;
  notebookTopicPageId: string;
  blockId: string;
  questionText: string;
  isCorrect?: boolean;
  attemptedAt: string;
  daysSinceLastVisit?: number;
}

export interface DbConfusionPattern {
  id: string;
  conceptA: string;
  conceptB: string;
  topicIds: string[]; // Stored as JSON in DB
  occurrenceCount: number;
  lastOccurrence: string;
  disambiguationCardId?: string;
}

export interface DbSmartView {
  id: string;
  name: string;
  icon: string;
  filter: {
    status?: string[];
    sourceType?: string[];
    topicIds?: string[];
    tags?: string[];
  };
  sortBy: string;
  isSystem: boolean;
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

export interface LowEaseTopic {
  topicId: string;
  topicName: string;
  strugglingCardCount: number;
  avgDifficulty: number;
  worstDifficulty: number;
}

// ============================================================================
// Internal Row Types (JSON fields are strings in SQLite)
// ============================================================================

export interface CardRow {
  id: string;
  front: string;
  back: string;
  noteId: string;
  tags: string;
  dueDate: string;
  createdAt: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
  // Card type fields (v2)
  cardType: string | null;
  parentListId: string | null;
  listPosition: number | null;
  notebookTopicPageId: string | null;
  sourceBlockId: string | null;
  aiTitle: string | null;
  // Data Logging Framework (v18)
  targetedConfusion: string | null;
  relevanceScore: string | null;
  relevanceReason: string | null;
  // Notebook v2: Card Activation (v24)
  activationStatus: string;
  activationTier: string | null;
  activationReasons: string | null; // JSON string
  activatedAt: string | null;
  suspendReason: string | null;
  suspendedAt: string | null;
}

export interface CardBrowserFilters {
  status?: number[]; // Filter by state (0,1,2,3)
  topicId?: string; // Filter by notebookTopicPageId
  tags?: string[]; // Filter by tags (any match)
  leechesOnly?: boolean; // Only return leeches
  search?: string; // Search in front/back text
}

export interface CardBrowserSort {
  field: "dueDate" | "createdAt" | "difficulty" | "lastReview";
  direction: "asc" | "desc";
}

export interface CardBrowserRow extends CardRow {
  topicName: string | null;
  siblingCount: number;
  isLeech: number; // 0 or 1 in SQLite
}

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  cardIds: string;
  tags: string;
  createdAt: string;
}

export interface ReviewLogRow {
  id: string;
  cardId: string;
  rating: number;
  state: number;
  scheduledDays: number;
  elapsedDays: number;
  review: string;
  createdAt: string;
  // Response tracking fields (v2)
  responseTimeMs: number | null;
  partialCreditScore: number | null;
  responseTimeModifier: number | null;
  userAnswer: string | null;
  userExplanation: string | null;
  // Data Logging Framework (v18)
  confidenceRating: string | null;
}

export interface QuickCaptureRow {
  id: string;
  content: string;
  extractionStatus: string;
  createdAt: string;
  processedAt: string | null;
}

export interface ConnectionRow {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  semanticScore: number;
  createdAt: string;
}

export interface SourceItemRow {
  id: string;
  sourceType: string;
  sourceName: string;
  sourceUrl: string | null;
  title: string;
  rawContent: string;
  mediaPath: string | null;
  transcription: string | null;
  canonicalTopicIds: string; // JSON
  tags: string; // JSON
  questionId: string | null;
  metadata: string | null; // JSON
  status: string;
  createdAt: string;
  processedAt: string | null;
  updatedAt: string | null;
  // Data Logging Framework (v18)
  correctness: string | null;
  notes: string | null;
  testedConcepts: string | null; // JSON string
}

export interface CanonicalTopicRow {
  id: string;
  canonicalName: string;
  aliases: string; // JSON
  domain: string;
  parentTopicId: string | null;
  createdAt: string;
}

export interface TopicWithStats {
  id: string;
  title: string;
  canonicalTopicId: string | null;
  updatedAt: string;
  canonicalName: string | null;
  domain: string | null;
  aliases: string | null; // JSON string array
  blockCount: number;
  cardCount: number;
}

export interface NotebookTopicPageRow {
  id: string;
  canonicalTopicId: string;
  cardIds: string; // JSON
  createdAt: string;
  updatedAt: string;
  // Notebook v2: Topic Entry Quiz tracking (v24)
  lastVisitedAt: string | null;
}

export interface NotebookBlockRow {
  id: string;
  notebookTopicPageId: string;
  sourceItemId: string | null;
  content: string;
  annotations: string | null;
  mediaPath: string | null;
  position: number;
  cardCount: number;
  // New AI evaluation fields (v16)
  userInsight: string | null;
  aiEvaluation: string | null; // JSON string
  relevanceScore: string | null;
  relevanceReason: string | null;
  calloutType: string | null;
  isHighYield: number; // SQLite INTEGER: 0 or 1
  // Notebook v2: Intake Quiz tracking (v24)
  intakeQuizResult: string | null;
  intakeQuizAnswer: string | null;
  priorityScore: number;
  priorityReasons: string | null; // JSON string
}

export interface NotebookLinkRow {
  id: string;
  sourceBlockId: string;
  targetBlockId: string;
  linkType: string;
  reason: string | null;
  anchorText: string | null;
  anchorStart: number | null;
  anchorEnd: number | null;
  createdAt: string;
}

export interface SmartViewRow {
  id: string;
  name: string;
  icon: string;
  filter: string; // JSON
  sortBy: string;
  isSystem: number; // SQLite INTEGER for boolean
}

// ============================================================================
// Notebook v2: New Row Types (v24)
// ============================================================================

export interface BlockTopicAssignmentRow {
  id: string;
  blockId: string;
  topicPageId: string;
  isPrimaryTopic: number; // SQLite INTEGER: 0 or 1
  createdAt: string;
}

export interface IntakeQuizAttemptRow {
  id: string;
  sourceItemId: string;
  notebookTopicPageId: string;
  blockId: string;
  questionText: string;
  userAnswer: string | null;
  isCorrect: number | null; // SQLite INTEGER: 0 or 1
  wasSkipped: number; // SQLite INTEGER: 0 or 1
  attemptedAt: string;
}

export interface TopicQuizAttemptRow {
  id: string;
  notebookTopicPageId: string;
  blockId: string;
  questionText: string;
  isCorrect: number | null; // SQLite INTEGER: 0 or 1
  attemptedAt: string;
  daysSinceLastVisit: number | null;
}

export interface ConfusionPatternRow {
  id: string;
  conceptA: string;
  conceptB: string;
  topicIds: string; // JSON string
  occurrenceCount: number;
  lastOccurrence: string;
  disambiguationCardId: string | null;
}

// ============================================================================
// Database Status and Search Types
// ============================================================================

export interface DbStatus {
  version: number;
  cardCount: number;
  noteCount: number;
  sourceItemCount: number;
  quickCaptureCount: number;
  inboxCount: number;
  queueCount: number;
  notebookCount: number;
  connectionCount: number;
  weakTopicsCount: number;
}

export type SearchFilter = "all" | "cards" | "notes" | "inbox";

export interface SearchResultItem {
  id: string;
  type: "card" | "note" | "source_item";
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
