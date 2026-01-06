/**
 * TabFlow – Undo Stack Persistence
 *
 * Persists and loads undo stack from IndexedDB.
 * The undo stack is stored as individual entries with auto-increment keys.
 * This allows efficient push/pop operations.
 *
 * Design:
 * - Stack is stored in IndexedDB 'undoStack' store
 * - Each entry has an auto-increment key (higher = newer)
 * - Pop removes the entry with the highest key
 * - Stack depth is limited to MAX_UNDO_DEPTH
 */

import type { UndoEntry } from "@shared/types";
import { MAX_UNDO_DEPTH } from "@shared/constants";
import { getDB, withErrorHandling } from "./db";

// =============================================================================
// Undo Stack Read Operations
// =============================================================================

/**
 * Load the entire undo stack from IndexedDB.
 * Returns entries in order (oldest first, newest last).
 *
 * @returns Promise resolving to array of undo entries
 * @throws StorageError if read fails
 */
export async function loadUndoStack(): Promise<UndoEntry[]> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("undoStack", "readonly");

    // Get all entries with their keys
    const entries: UndoEntry[] = [];
    let cursor = await tx.store.openCursor();

    while (cursor) {
      entries.push(cursor.value);
      cursor = await cursor.continue();
    }

    await tx.done;
    return entries;
  }, "load undo stack");
}

/**
 * Get the number of entries in the undo stack.
 *
 * @returns Promise resolving to entry count
 * @throws StorageError if read fails
 */
export async function getUndoStackSize(): Promise<number> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("undoStack", "readonly");
    const count = await tx.store.count();
    await tx.done;
    return count;
  }, "get undo stack size");
}

/**
 * Peek at the most recent undo entry without removing it.
 *
 * @returns Promise resolving to the most recent entry, or undefined if empty
 * @throws StorageError if read fails
 */
export async function peekUndoStack(): Promise<UndoEntry | undefined> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("undoStack", "readonly");

    // Open cursor in reverse to get the last entry
    let cursor = await tx.store.openCursor(null, "prev");
    const entry = cursor?.value;

    await tx.done;
    return entry;
  }, "peek undo stack");
}

// =============================================================================
// Undo Stack Write Operations
// =============================================================================

/**
 * Push a new entry onto the undo stack.
 * Automatically prunes old entries if stack exceeds MAX_UNDO_DEPTH.
 *
 * @param entry - Undo entry to push
 * @throws StorageError if write fails
 */
export async function pushUndoEntry(entry: UndoEntry): Promise<void> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("undoStack", "readwrite");

    // Add the new entry
    await tx.store.add(entry);

    // Check if we need to prune old entries
    const count = await tx.store.count();
    if (count > MAX_UNDO_DEPTH) {
      // Get the oldest entries to delete
      const deleteCount = count - MAX_UNDO_DEPTH;
      let cursor = await tx.store.openCursor();
      let deleted = 0;

      while (cursor && deleted < deleteCount) {
        await cursor.delete();
        deleted++;
        cursor = await cursor.continue();
      }
    }

    await tx.done;
  }, "push undo entry");
}

/**
 * Pop the most recent entry from the undo stack.
 *
 * @returns Promise resolving to the popped entry, or undefined if stack is empty
 * @throws StorageError if operation fails
 */
export async function popUndoEntry(): Promise<UndoEntry | undefined> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("undoStack", "readwrite");

    // Open cursor in reverse to get the last entry
    let cursor = await tx.store.openCursor(null, "prev");

    if (!cursor) {
      await tx.done;
      return undefined;
    }

    const entry = cursor.value;
    await cursor.delete();

    await tx.done;
    return entry;
  }, "pop undo entry");
}

/**
 * Clear the entire undo stack.
 *
 * @throws StorageError if clear fails
 */
export async function clearUndoStack(): Promise<void> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("undoStack", "readwrite");
    await tx.store.clear();
    await tx.done;
  }, "clear undo stack");
}

/**
 * Persist the entire undo stack, replacing existing entries.
 * Used when rehydrating from memory or during migration.
 *
 * @param stack - Array of undo entries to persist
 * @throws StorageError if persist fails
 */
export async function persistUndoStack(stack: UndoEntry[]): Promise<void> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("undoStack", "readwrite");

    // Clear existing entries
    await tx.store.clear();

    // Add all entries from the stack
    // Only keep the most recent MAX_UNDO_DEPTH entries
    const entriesToStore = stack.slice(-MAX_UNDO_DEPTH);

    for (const entry of entriesToStore) {
      await tx.store.add(entry);
    }

    await tx.done;
  }, "persist undo stack");
}

// =============================================================================
// Undo Entry Helpers
// =============================================================================

/**
 * Create a typed undo entry for saving a session.
 */
export function createSaveSessionUndo(sessionId: string): UndoEntry {
  return {
    type: "SAVE_SESSION",
    timestamp: Date.now(),
    data: { sessionId },
  };
}

/**
 * Create a typed undo entry for deleting a session.
 */
export function createDeleteSessionUndo(
  session: import("@shared/types").Session
): UndoEntry {
  return {
    type: "DELETE_SESSION",
    timestamp: Date.now(),
    data: { session },
  };
}

/**
 * Create a typed undo entry for applying AI grouping.
 */
export function createApplyGroupingUndo(
  previousSession: import("@shared/types").Session
): UndoEntry {
  return {
    type: "APPLY_GROUPING",
    timestamp: Date.now(),
    data: { previousSession },
  };
}

/**
 * Create a typed undo entry for importing data.
 */
export function createImportUndo(
  previousSessions: import("@shared/types").Session[]
): UndoEntry {
  return {
    type: "IMPORT",
    timestamp: Date.now(),
    data: { previousSessions },
  };
}
