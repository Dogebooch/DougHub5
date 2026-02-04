// Auto-generated modular database barrel (CLEANED UP)
export type {
  ExtractionStatus,
  SourceType,
  SourceItemStatus,
  CorrectnessType,
  DbQuickCapture,
  DbSourceItem,
  DbCanonicalTopic,
  DbMedicalAcronym,
  DbStatus,
  SearchFilter,
  SearchResult,
  SearchResultItem,
  // Keep confusion patterns for future AI context
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

export {
  sourceItemQueries,
  quickCaptureQueries,
  getBoardRelevanceForTopic,
  parseSourceItemRow,
  parseQuickCaptureRow,
} from "./database/source-items";

export {
  canonicalTopicQueries,
  parseCanonicalTopicRow,
} from "./database/canonical-topics";

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

// Keep confusion patterns for future AI context
export { confusionPatternQueries } from "./database/confusion-patterns";

// Knowledge Entities (keep for structured capture)
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
} from "./database/types";
export { GOLDEN_TICKET_FIELDS } from "./database/types";
