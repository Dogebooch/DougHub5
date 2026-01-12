// Auto-generated modular database barrel
export type {
  CardType,
  ExtractionStatus,
  SourceType,
  SourceItemStatus,
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
  CardBrowserFilters,
  CardBrowserSort,
  DbStatus,
  SearchFilter,
  SearchResult,
  SearchResultItem,
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
export { noteQueries, parseNoteRow } from "./database/notes";
export { reviewLogQueries, parseReviewLogRow } from "./database/review-logs";
export {
  sourceItemQueries,
  quickCaptureQueries,
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
  parseNotebookTopicPageRow,
} from "./database/notebook-topic-pages";
export {
  notebookBlockQueries,
  parseNotebookBlockRow,
} from "./database/notebook-blocks";
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
export { getDatabaseStatus } from "./database/status";
