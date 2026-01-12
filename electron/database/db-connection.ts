import Database from "better-sqlite3";
import {
  getSchemaVersion as getSchemaVersionHelper,
  setSchemaVersion as setSchemaVersionHelper,
  columnExists as columnExistsHelper,
  tableExists as tableExistsHelper,
} from "./helpers";

let db: Database.Database | null = null;
let currentDbPath: string | null = null;

export function initializeConnection(dbPath: string): Database.Database {
  if (db) {
    return db;
  }

  db = new Database(dbPath);
  currentDbPath = dbPath;

  // Enable WAL mode for better performance
  db.pragma("journal_mode = WAL");

  // Enable foreign key constraints
  db.pragma("foreign_keys = ON");

  return db;
}

export function reopenConnection(dbPath: string): Database.Database {
  closeDatabase();
  return initializeConnection(dbPath);
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    currentDbPath = null;
  }
}

export function getDbPath(): string | null {
  return currentDbPath;
}

export function getSchemaVersion(database?: Database.Database): number {
  const dbInstance = database ?? getDatabase();
  return getSchemaVersionHelper(dbInstance);
}

export function setSchemaVersion(
  version: number,
  database?: Database.Database
): void {
  const dbInstance = database ?? getDatabase();
  setSchemaVersionHelper(dbInstance, version);
}

export function columnExists(
  table: string,
  column: string,
  database?: Database.Database
): boolean {
  const dbInstance = database ?? getDatabase();
  return columnExistsHelper(dbInstance, table, column);
}

export function tableExists(
  table: string,
  database?: Database.Database
): boolean {
  const dbInstance = database ?? getDatabase();
  return tableExistsHelper(dbInstance, table);
}