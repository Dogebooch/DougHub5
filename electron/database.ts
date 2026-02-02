// Auto-generated modular database barrel
export type {
  CardType,
  ExtractionStatus,
  SourceType,
  SourceItemStatus,
  CorrectnessType,
  ConfidenceRating,
  DbCard,
  DbNote,
  DbReviewLog,
  DbQuickCapture,
  DbConnection,
  DbSourceItem,
  DbCanonicalTopic,
  DbNotebookTopicPage,
  DbNotebookBlock,
  DbMedicalAcronym,
  DbSmartView,
  WeakTopicSummary,
  LowEaseTopic,
  TopicWithStats,
  CardBrowserFilters,
  CardBrowserSort,
  DbStatus,
  SearchFilter,
  SearchResult,
  SearchResultItem,
  // Notebook v2 (v24)
  ActivationStatus,
  ActivationTier,
  SuspendReason,
  IntakeQuizResult,
  DbBlockTopicAssignment,
  DbIntakeQuizAttempt,
  DbTopicQuizAttempt,
  DbConfusionPattern,
} from "./database/types";

export {
  initDatabase,
  getDatabase,
  closeDatabase,
  getDbPath,
  columnExists,
  tableExists,
  getSchemaVersion,
  setSchemaVersion,
} from "./database/client";

export { cardQueries, parseCardRow } from "./database/cards";
export type { GlobalCardStats } from "./database/cards";
export { noteQueries, parseNoteRow } from "./database/notes";
export { reviewLogQueries, parseReviewLogRow } from "./database/review-logs";
export {
  sourceItemQueries,
  quickCaptureQueries,
  getBoardRelevanceForTopic,
  parseSourceItemRow,
  parseQuickCaptureRow,
} from "./database/source-items";
export { connectionQueries } from "./database/connections";
export {
  canonicalTopicQueries,
  parseCanonicalTopicRow,
} from "./database/canonical-topics";
export {
  notebookTopicPageQueries,
  getTopicsWithStats as getNotebookTopicsWithStats,
  parseNotebookTopicPageRow,
} from "./database/notebook-topic-pages";
export {
  notebookBlockQueries,
  parseNotebookBlockRow,
} from "./database/notebook-blocks";
export {
  notebookLinkQueries,
  parseNotebookLinkRow,
} from "./database/notebook-links";
export {
  smartViewQueries,
  seedSystemSmartViews,
  parseSmartViewRow,
} from "./database/smart-views";
export {
  medicalAcronymQueries,
  getAcronymCache,
  invalidateAcronymCache,
  seedMedicalAcronymsFromLocalFile,
} from "./database/medical-acronyms";
export {
  referenceRangeQueries,
  getReferenceRangeCache,
  invalidateReferenceRangeCache,
  seedReferenceRangesFromLocalFile,
} from "./database/reference-ranges";
export type { ReferenceRange } from "./database/reference-ranges";
export { searchQueries } from "./database/search";
export { settingsQueries } from "./database/settings";
export { devSettingsQueries } from "./database/dev-settings";
export { getDatabaseStatus } from "./database/status";

// Notebook v2 query modules (v24)
export { intakeQuizQueries } from "./database/intake-quiz";
export { topicQuizQueries } from "./database/topic-quiz";
export { confusionPatternQueries } from "./database/confusion-patterns";
export { blockTopicAssignmentQueries } from "./database/block-topic-assignments";

// Medical Knowledge Archetypes (v26)
export {
  knowledgeEntityQueries,
  knowledgeEntityLinkQueries,
} from "./database/knowledge-entities";
export type {
  DbKnowledgeEntity,
  DbKnowledgeEntityLink,
  KnowledgeEntityType,
  KnowledgeLinkType,
  IllnessScriptData,
  DrugData,
  PathogenData,
  PresentationData,
  DiagnosticData,
  ImagingFindingData,
  ProcedureData,
  AnatomyData,
  AlgorithmData,
  GenericConceptData,
  // Practice Bank (v28)
  DbPracticeBankFlashcard,
  PracticeBankFlashcardRow,
  PracticeBankCardType,
  PracticeBankMaturityState,
  DbSimulatorAttempt,
  SimulatorAttemptRow,
  CardGenerationTemplate,
  FailureAttributionOption,
} from "./database/types";
export {
  GOLDEN_TICKET_FIELDS,
  FAILURE_ATTRIBUTION_OPTIONS,
} from "./database/types";

// Practice Bank (v28)
export {
  practiceBankQueries,
  simulatorAttemptQueries,
} from "./database/practice-bank";
export {
  generateCardsForEntity,
  getExpectedCardCount,
  isEntityReadyForForging,
} from "./database/flashcard-template-engine";
