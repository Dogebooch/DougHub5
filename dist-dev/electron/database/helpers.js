"use strict";
/**
 * Database Helper Functions
 *
 * Utility functions for schema inspection, compression, and common operations.
 * Separated from database.ts for better maintainability.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressString = compressString;
exports.decompressBuffer = decompressBuffer;
exports.getSchemaVersion = getSchemaVersion;
exports.setSchemaVersion = setSchemaVersion;
exports.columnExists = columnExists;
exports.tableExists = tableExists;
const zlib_1 = __importDefault(require("zlib"));
// ============================================================================
// Compression Utilities
// ============================================================================
/**
 * Compresses a string using Gzip. Returns a Buffer.
 */
function compressString(text) {
    return zlib_1.default.gzipSync(text);
}
/**
 * Decompresses a Gzip buffer back into a string.
 * Falls back to plain text if decompression fails (legacy data).
 */
function decompressBuffer(buffer) {
    try {
        return zlib_1.default.gunzipSync(buffer).toString("utf-8");
    }
    catch (error) {
        console.error("[Database] Decompression failed, falling back to plain text:", error);
        // If it's not a valid gzip buffer, it might be legacy plain text
        try {
            return buffer.toString("utf-8");
        }
        catch (fallbackError) {
            console.error("[Database] Failed to decode buffer as UTF-8:", fallbackError);
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
function getSchemaVersion(db) {
    return db.pragma("user_version", { simple: true });
}
/**
 * Set schema version via user_version pragma.
 */
function setSchemaVersion(db, version) {
    db.pragma(`user_version = ${version}`);
}
/**
 * Check if a column exists in a table.
 */
function columnExists(db, table, column) {
    const columns = db
        .prepare(`PRAGMA table_info(${table})`)
        .all();
    return columns.some((c) => c.name === column);
}
/**
 * Check if a table exists in the database.
 */
function tableExists(db, table) {
    const result = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table);
    return result !== undefined;
}
