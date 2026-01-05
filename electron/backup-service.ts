import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// Backup Service - Auto-backup before migrations with rollback support
// ============================================================================

export interface BackupInfo {
  filename: string;
  timestamp: Date;
  size: number;
}

/**
 * Get the backups directory path.
 * Uses app.getPath('userData')/backups/
 */
export function getBackupsDir(): string {
  return path.join(app.getPath('userData'), 'backups');
}

/**
 * Ensure the backups directory exists.
 * Call this on app startup.
 */
export function ensureBackupsDir(): void {
  const dir = getBackupsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Create a backup of the database file.
 * @param dbPath - Full path to the source database file
 * @returns Full path to the created backup file
 */
export function createBackup(dbPath: string): string {
  ensureBackupsDir();
  
  // Generate ISO timestamp safe for filenames (replace colons and periods)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `doughub-${timestamp}.db`;
  const backupPath = path.join(getBackupsDir(), backupFilename);
  
  fs.copyFileSync(dbPath, backupPath);
  console.log(`[Backup] Created: ${backupPath}`);
  
  return backupPath;
}

/**
 * Restore a database from a backup file.
 * @param backupPath - Full path to the backup file
 * @param dbPath - Full path to the target database file
 */
export function restoreBackup(backupPath: string, dbPath: string): void {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupPath}`);
  }
  
  fs.copyFileSync(backupPath, dbPath);
  console.log(`[Backup] Restored from: ${backupPath}`);
}

/**
 * List all available backups, sorted by timestamp (newest first).
 * @returns Array of backup info objects
 */
export function listBackups(): BackupInfo[] {
  const dir = getBackupsDir();
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('doughub-') && f.endsWith('.db'))
    .map(filename => {
      const filePath = path.join(dir, filename);
      const stats = fs.statSync(filePath);
      
      // Parse timestamp from filename: doughub-2024-01-15T10-30-00-000Z.db
      // Convert back: replace first 2 dashes after T with colons, last dash before Z with period
      const timestampStr = filename
        .replace('doughub-', '')
        .replace('.db', '')
        .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
      
      let timestamp: Date;
      try {
        timestamp = new Date(timestampStr);
        // Fallback to file mtime if parsing fails
        if (isNaN(timestamp.getTime())) {
          timestamp = stats.mtime;
        }
      } catch {
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
export function cleanupOldBackups(retentionDays: number = 7): number {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const backups = listBackups();
  let deleted = 0;
  
  for (const backup of backups) {
    if (backup.timestamp.getTime() < cutoff) {
      const backupPath = path.join(getBackupsDir(), backup.filename);
      fs.unlinkSync(backupPath);
      console.log(`[Backup] Deleted old backup: ${backup.filename}`);
      deleted++;
    }
  }
  
  if (deleted > 0) {
    console.log(`[Backup] Cleaned up ${deleted} old backup(s)`);
  }
  
  return deleted;
}
