import type Database from "better-sqlite3";
import {
  getDatabase,
  getSchemaVersion,
  initializeConnection,
  setSchemaVersion,
} from "./db-connection";
import { createInitialSchema } from "./schema";
import { runMigrations } from "./migrations";
import { seedSystemSmartViews } from "./smart-views";
import { seedMedicalAcronymsFromLocalFile } from "./medical-acronyms";
import { seedSampleData } from "./seed-sample-data";

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

  seedSampleData();
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
