"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackupsDir = getBackupsDir;
exports.ensureBackupsDir = ensureBackupsDir;
exports.createBackup = createBackup;
exports.restoreBackup = restoreBackup;
exports.listBackups = listBackups;
exports.cleanupOldBackups = cleanupOldBackups;
exports.pruneBackupsToCount = pruneBackupsToCount;
exports.getLastBackupTimestamp = getLastBackupTimestamp;
const electron_1 = require("electron");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
/**
 * Get the backups directory path.
 * Uses app.getPath('userData')/backups/
 */
function getBackupsDir() {
    return node_path_1.default.join(electron_1.app.getPath('userData'), 'backups');
}
/**
 * Ensure the backups directory exists.
 * Call this on app startup.
 */
function ensureBackupsDir() {
    const dir = getBackupsDir();
    if (!node_fs_1.default.existsSync(dir)) {
        node_fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
/**
 * Create a backup of the database file.
 * @param dbPath - Full path to the source database file
 * @returns Full path to the created backup file
 */
function createBackup(dbPath) {
    ensureBackupsDir();
    // Generate ISO timestamp safe for filenames (replace colons and periods)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `doughub-${timestamp}.db`;
    const backupPath = node_path_1.default.join(getBackupsDir(), backupFilename);
    node_fs_1.default.copyFileSync(dbPath, backupPath);
    console.log(`[Backup] Created: ${backupPath}`);
    return backupPath;
}
/**
 * Restore a database from a backup file.
 * @param backupPath - Full path to the backup file
 * @param dbPath - Full path to the target database file
 */
function restoreBackup(backupPath, dbPath) {
    if (!node_fs_1.default.existsSync(backupPath)) {
        throw new Error(`Backup not found: ${backupPath}`);
    }
    node_fs_1.default.copyFileSync(backupPath, dbPath);
    console.log(`[Backup] Restored from: ${backupPath}`);
}
/**
 * List all available backups, sorted by timestamp (newest first).
 * @returns Array of backup info objects
 */
function listBackups() {
    const dir = getBackupsDir();
    if (!node_fs_1.default.existsSync(dir)) {
        return [];
    }
    return node_fs_1.default.readdirSync(dir)
        .filter(f => f.startsWith('doughub-') && f.endsWith('.db'))
        .map(filename => {
        const filePath = node_path_1.default.join(dir, filename);
        const stats = node_fs_1.default.statSync(filePath);
        // Parse timestamp from filename: doughub-2024-01-15T10-30-00-000Z.db
        // Convert back: replace first 2 dashes after T with colons, last dash before Z with period
        const timestampStr = filename
            .replace('doughub-', '')
            .replace('.db', '')
            .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
        let timestamp;
        try {
            timestamp = new Date(timestampStr);
            // Fallback to file mtime if parsing fails
            if (isNaN(timestamp.getTime())) {
                timestamp = stats.mtime;
            }
        }
        catch {
            timestamp = stats.mtime;
        }
        return {
            filename,
            timestamp,
            size: stats.size,
        };
    })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
/**
 * Delete backups older than the retention period.
 * @param retentionDays - Number of days to keep backups (default: 7)
 * @returns Number of backups deleted
 */
function cleanupOldBackups(retentionDays = 7) {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const backups = listBackups();
    let deleted = 0;
    for (const backup of backups) {
        if (backup.timestamp.getTime() < cutoff) {
            const backupPath = node_path_1.default.join(getBackupsDir(), backup.filename);
            node_fs_1.default.unlinkSync(backupPath);
            console.log(`[Backup] Deleted old backup: ${backup.filename}`);
            deleted++;
        }
    }
    if (deleted > 0) {
        console.log(`[Backup] Cleaned up ${deleted} old backup(s) based on age`);
    }
    return deleted;
}
/**
 * Limit the total number of backups to prevent disk bloat.
 * Keeps the newest backups and deletes the oldest once maxCount is exceeded.
 * @param maxCount - Maximum number of backup files to retain (default: 20)
 * @returns Number of backups deleted
 */
function pruneBackupsToCount(maxCount = 20) {
    const backups = listBackups();
    if (backups.length <= maxCount) {
        return 0;
    }
    const toDelete = backups.slice(maxCount);
    let deleted = 0;
    const dir = getBackupsDir();
    for (const backup of toDelete) {
        try {
            const backupPath = node_path_1.default.join(dir, backup.filename);
            node_fs_1.default.unlinkSync(backupPath);
            deleted++;
        }
        catch (error) {
            console.error(`[Backup] Failed to delete surplus backup ${backup.filename}:`, error);
        }
    }
    if (deleted > 0) {
        console.log(`[Backup] Pruned ${deleted} surplus backup(s) (Max allowed: ${maxCount})`);
    }
    return deleted;
}
/**
 * Get the timestamp of the most recent backup.
 * @returns ISO string or null if no backups exist
 */
function getLastBackupTimestamp() {
    const backups = listBackups();
    if (backups.length === 0) {
        return null;
    }
    return backups[0].timestamp.toISOString();
}
