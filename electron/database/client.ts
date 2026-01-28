import type Database from "better-sqlite3";
import {
  getDatabase,
  getSchemaVersion,
  initializeConnection,
  setSchemaVersion,
  vacuumDatabase,
} from "./db-connection";
import { createInitialSchema } from "./schema";
import { runMigrations } from "./migrations";
import { seedSystemSmartViews } from "./smart-views";
import { seedMedicalAcronymsFromLocalFile } from "./medical-acronyms";
import { seedReferenceRangesFromLocalFile } from "./reference-ranges";

export function initDatabase(dbPath: string): Database.Database {
  const db = initializeConnection(dbPath);

  const version = getSchemaVersion();
  if (version === 0) {
    createInitialSchema(getDatabase(), setSchemaVersion);
  }

  runMigrations(dbPath);

  const updatedVersion = getSchemaVersion();
  if (updatedVersion >= 3) {
    seedSystemSmartViews();
  }
  if (updatedVersion >= 5) {
    seedMedicalAcronymsFromLocalFile();
  }
  if (updatedVersion >= 15) {
    seedReferenceRangesFromLocalFile();
  }

  // Optimize file size after initialization and seeding
  vacuumDatabase();

  return db;
}

export {
  getDatabase,
  closeDatabase,
  getDbPath,
  getSchemaVersion,
  setSchemaVersion,
  columnExists,
  tableExists,
} from "./db-connection";

// Notebook v2 query modules (v24)
export { intakeQuizQueries } from "./intake-quiz";
export { topicQuizQueries } from "./topic-quiz";
export { confusionPatternQueries } from "./confusion-patterns";
export { blockTopicAssignmentQueries } from "./block-topic-assignments";
