/**
 * Database Helper Functions
 * 
 * Utility functions for schema inspection, compression, and common operations.
 * Separated from database.ts for better maintainability.
 */

import zlib from "zlib";
import type Database from "better-sqlite3";

// ============================================================================
// Compression Utilities
// ============================================================================

/**
 * Compresses a string using Gzip. Returns a Buffer.
 */
export function compressString(text: string): Buffer {
  return zlib.gzipSync(text);
}

/**
 * Decompresses a Gzip buffer back into a string.
 * Falls back to plain text if decompression fails (legacy data).
 */
export function decompressBuffer(buffer: Buffer): string {
  try {
    return zlib.gunzipSync(buffer).toString("utf-8");
  } catch (error) {
    console.error(
      "[Database] Decompression failed, falling back to plain text:",
      error
    );
    // If it's not a valid gzip buffer, it might be legacy plain text
    try {
      return buffer.toString("utf-8");
    } catch (fallbackError) {
      console.error(
        "[Database] Failed to decode buffer as UTF-8:",
        fallbackError
      );
      throw new Error("Unable to decompress or decode buffer");
    }
  }
}

// ============================================================================
// Schema Inspection Utilities
// ============================================================================

/**
 * Get current schema version from user_version pragma.
 */
export function getSchemaVersion(db: Database.Database): number {
  return db.pragma("user_version", { simple: true }) as number;
}

/**
 * Set schema version via user_version pragma.
 */
export function setSchemaVersion(db: Database.Database, version: number): void {
  db.pragma(`user_version = ${version}`);
}

/**
 * Check if a column exists in a table.
 */
export function columnExists(
  db: Database.Database,
  table: string,
  column: string
): boolean {
  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

/**
 * Check if a table exists in the database.
 */
export function tableExists(db: Database.Database, table: string): boolean {
  const result = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table) as { name: string } | undefined;
  return result !== undefined;
}
