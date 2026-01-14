/**
 * TabFlow – Backup Storage Operations
 *
 * Handles automatic and manual backup operations.
 * Backups are stored in IndexedDB 'backups' store with timestamp keys.
 *
 * Design:
 * - Each backup is a complete snapshot of all sessions
 * - Backups are keyed by ISO timestamp string
 * - Old backups are automatically pruned (keep last N)
 * - Export/import uses JSON format for portability
 */

import type { Session, BackupBlob, Settings } from "@shared/types";
import { MAX_BACKUPS_RETAINED } from "@shared/constants";
import { getDB, withErrorHandling } from "./db";
import { getAllSessions } from "./sessions";

// =============================================================================
// Backup Read Operations
// =============================================================================

/**
 * Get the most recent backup.
 *
 * @returns Promise resolving to the latest backup, or undefined if none
 * @throws StorageError if read fails
 */
export async function getLatestBackup(): Promise<BackupBlob | undefined> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("backups", "readonly");

    // Open cursor in reverse (newest first) and get first entry
    const cursor = await tx.store.openCursor(null, "prev");
    const backup = cursor?.value;

    await tx.done;
    return backup;
  }, "get latest backup");
}

/**
 * Get all backups, sorted by timestamp (newest first).
 *
 * @returns Promise resolving to array of backups
 * @throws StorageError if read fails
 */
export async function getAllBackups(): Promise<BackupBlob[]> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("backups", "readonly");

    const backups: BackupBlob[] = [];
    let cursor = await tx.store.openCursor(null, "prev");

    while (cursor) {
      backups.push(cursor.value);
      cursor = await cursor.continue();
    }

    await tx.done;
    return backups;
  }, "get all backups");
}

/**
 * Get a specific backup by timestamp.
 *
 * @param timestamp - ISO timestamp string
 * @returns Promise resolving to backup, or undefined if not found
 * @throws StorageError if read fails
 */
export async function getBackup(timestamp: string): Promise<BackupBlob | undefined> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("backups", "readonly");
    const backup = await tx.store.get(timestamp);
    await tx.done;
    return backup;
  }, `get backup ${timestamp}`);
}

/**
 * Get the number of backups stored.
 *
 * @returns Promise resolving to backup count
 * @throws StorageError if read fails
 */
export async function getBackupCount(): Promise<number> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("backups", "readonly");
    const count = await tx.store.count();
    await tx.done;
    return count;
  }, "get backup count");
}

// =============================================================================
// Backup Write Operations
// =============================================================================

/**
 * Create a backup of all current sessions.
 * Automatically prunes old backups if count exceeds MAX_BACKUPS_RETAINED.
 *
 * @param sessions - Sessions to backup (if not provided, fetches from storage)
 * @returns Promise resolving to the created backup
 * @throws StorageError if write fails
 */
export async function createBackup(sessions?: Session[]): Promise<BackupBlob> {
  return withErrorHandling(async () => {
    // Fetch sessions if not provided
    const sessionsToBackup = sessions ?? (await getAllSessions());

    const backup: BackupBlob = {
      version: 1,
      timestamp: new Date().toISOString(),
      sessions: sessionsToBackup,
    };

    const db = await getDB();
    const tx = db.transaction("backups", "readwrite");

    // Store the backup with timestamp as key
    await tx.store.put(backup, backup.timestamp);

    // Prune old backups if needed
    const count = await tx.store.count();
    if (count > MAX_BACKUPS_RETAINED) {
      const deleteCount = count - MAX_BACKUPS_RETAINED;
      let cursor = await tx.store.openCursor();
      let deleted = 0;

      // Delete oldest backups (cursor starts at oldest)
      while (cursor && deleted < deleteCount) {
        await cursor.delete();
        deleted++;
        cursor = await cursor.continue();
      }
    }

    await tx.done;
    return backup;
  }, "create backup");
}

/**
 * Delete a specific backup by timestamp.
 *
 * @param timestamp - ISO timestamp string
 * @throws StorageError if delete fails
 */
export async function deleteBackup(timestamp: string): Promise<void> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("backups", "readwrite");
    await tx.store.delete(timestamp);
    await tx.done;
  }, `delete backup ${timestamp}`);
}

/**
 * Prune old backups, keeping only the most recent N.
 *
 * @param keepCount - Number of backups to keep (default: MAX_BACKUPS_RETAINED)
 * @returns Promise resolving to number of backups deleted
 * @throws StorageError if prune fails
 */
export async function pruneOldBackups(keepCount: number = MAX_BACKUPS_RETAINED): Promise<number> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("backups", "readwrite");

    const count = await tx.store.count();
    if (count <= keepCount) {
      await tx.done;
      return 0;
    }

    const deleteCount = count - keepCount;
    let cursor = await tx.store.openCursor();
    let deleted = 0;

    while (cursor && deleted < deleteCount) {
      await cursor.delete();
      deleted++;
      cursor = await cursor.continue();
    }

    await tx.done;
    return deleted;
  }, "prune old backups");
}

/**
 * Clear all backups.
 *
 * @returns Promise resolving to number of backups cleared
 * @throws StorageError if clear fails
 */
export async function clearAllBackups(): Promise<number> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("backups", "readwrite");
    const count = await tx.store.count();
    await tx.store.clear();
    await tx.done;
    return count;
  }, "clear all backups");
}

// =============================================================================
// Export/Import Operations
// =============================================================================

/**
 * Export all data as a JSON string.
 * Includes sessions and optionally settings.
 *
 * @param settings - Optional settings to include in export
 * @returns Promise resolving to JSON string
 * @throws StorageError if export fails
 */
export async function exportData(settings?: Settings): Promise<string> {
  return withErrorHandling(async () => {
    const sessions = await getAllSessions();

    const exportBlob: BackupBlob = {
      version: 1,
      timestamp: new Date().toISOString(),
      sessions,
      settings,
    };

    return JSON.stringify(exportBlob, null, 2);
  }, "export data");
}

/**
 * Parse and validate import data from JSON string.
 * Does NOT import the data - returns the parsed blob for validation.
 *
 * @param json - JSON string to parse
 * @returns Parsed BackupBlob
 * @throws StorageError if parse or validation fails
 */
export function parseImportData(json: string): BackupBlob {
  try {
    const data = JSON.parse(json);

    // Basic validation
    if (!data || typeof data !== "object") {
      throw new Error("Invalid import data: not an object");
    }

    if (typeof data.version !== "number") {
      throw new Error("Invalid import data: missing version");
    }

    if (!Array.isArray(data.sessions)) {
      throw new Error("Invalid import data: sessions must be an array");
    }

    // Validate each session has required fields
    for (let i = 0; i < data.sessions.length; i++) {
      const session = data.sessions[i];
      if (!session.id || typeof session.id !== "string") {
        throw new Error(`Invalid session at index ${i}: missing or invalid id`);
      }
      if (typeof session.createdAt !== "number") {
        throw new Error(`Invalid session at index ${i}: missing or invalid createdAt`);
      }
      if (!Array.isArray(session.groups)) {
        throw new Error(`Invalid session at index ${i}: groups must be an array`);
      }
    }

    return data as BackupBlob;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON format");
    }
    throw error;
  }
}

// =============================================================================
// Restore Operations
// =============================================================================

/**
 * Restore sessions from a backup.
 * Replaces all current sessions with backup data.
 *
 * @param backup - Backup to restore from
 * @returns Promise resolving to array of previous sessions (for undo)
 * @throws StorageError if restore fails
 */
export async function restoreFromBackup(backup: BackupBlob): Promise<Session[]> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");

    // Get current sessions for undo
    const previousSessions = await tx.store.getAll();

    // Clear and restore
    await tx.store.clear();

    for (const session of backup.sessions) {
      await tx.store.put(session);
    }

    await tx.done;
    return previousSessions;
  }, "restore from backup");
}
