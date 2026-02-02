"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeConnection = initializeConnection;
exports.vacuumDatabase = vacuumDatabase;
exports.reopenConnection = reopenConnection;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.getDbPath = getDbPath;
exports.getSchemaVersion = getSchemaVersion;
exports.setSchemaVersion = setSchemaVersion;
exports.columnExists = columnExists;
exports.tableExists = tableExists;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const helpers_1 = require("./helpers");
let db = null;
let currentDbPath = null;
function initializeConnection(dbPath) {
    if (db) {
        return db;
    }
    db = new better_sqlite3_1.default(dbPath);
    currentDbPath = dbPath;
    // Enable WAL mode for better performance
    db.pragma("journal_mode = WAL");
    // Enable foreign key constraints
    db.pragma("foreign_keys = ON");
    // Keep database file size lean
    db.pragma("auto_vacuum = INCREMENTAL");
    return db;
}
/**
 * Manually reclaim space and defragment the database file.
 * Useful after large deletions or significant schema changes.
 */
function vacuumDatabase() {
    if (!db)
        return;
    try {
        db.pragma("vacuum");
        console.log("[Database] Vacuum completed successfully");
    }
    catch (error) {
        console.error("[Database] Vacuum failed:", error);
    }
}
function reopenConnection(dbPath) {
    closeDatabase();
    return initializeConnection(dbPath);
}
function getDatabase() {
    if (!db) {
        throw new Error("Database not initialized. Call initDatabase() first.");
    }
    return db;
}
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        currentDbPath = null;
    }
}
function getDbPath() {
    return currentDbPath;
}
function getSchemaVersion(database) {
    const dbInstance = database ?? getDatabase();
    return (0, helpers_1.getSchemaVersion)(dbInstance);
}
function setSchemaVersion(version, database) {
    const dbInstance = database ?? getDatabase();
    (0, helpers_1.setSchemaVersion)(dbInstance, version);
}
function columnExists(table, column, database) {
    const dbInstance = database ?? getDatabase();
    return (0, helpers_1.columnExists)(dbInstance, table, column);
}
function tableExists(table, database) {
    const dbInstance = database ?? getDatabase();
    return (0, helpers_1.tableExists)(dbInstance, table);
}
