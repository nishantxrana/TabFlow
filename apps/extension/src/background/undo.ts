/**
 * TabFlow – Undo Stack Management
 *
 * Manages the undo stack for reversible actions.
 * Stack is kept in memory during active use and persisted to IndexedDB.
 *
 * Design:
 * - In-memory stack for fast access
 * - Persisted to IndexedDB on every change (debounced)
 * - Rehydrated on service worker wake-up
 * - Maximum depth of 10 entries
 */

import type { Session, UndoEntry } from "@shared/types";
import { MAX_UNDO_DEPTH, UNDO_PERSIST_DEBOUNCE_MS } from "@shared/constants";
import {
  loadUndoStack as loadFromStorage,
  persistUndoStack as persistToStorage,
  createSaveSessionUndo,
  createDeleteSessionUndo,
  createRenameSessionUndo,
  createImportUndo,
} from "@storage/undoStore";
import {
  deleteSession as deleteSessionFromStorage,
  saveSession as saveSessionToStorage,
  updateSession,
  clearAllSessions,
  importSessions,
} from "@storage/sessions";

// =============================================================================
// In-Memory Undo Stack
// =============================================================================

/**
 * In-memory undo stack.
 * Rehydrated from IndexedDB on service worker wake-up.
 */
let undoStack: UndoEntry[] = [];

/**
 * Flag to track if stack has been initialized.
 */
let isInitialized = false;

/**
 * Debounce timer for persistence.
 */
let persistTimeout: ReturnType<typeof setTimeout> | null = null;

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the undo stack from IndexedDB.
 * Called on service worker wake-up.
 */
export async function initUndoStack(): Promise<void> {
  if (isInitialized) return;

  try {
    undoStack = await loadFromStorage();
    isInitialized = true;
    console.log(
      "[TabFlow] Undo stack initialized:",
      undoStack.length,
      "entries"
    );
  } catch (error) {
    console.error("[TabFlow] Failed to load undo stack:", error);
    undoStack = [];
    isInitialized = true;
  }
}

/**
 * Ensure undo stack is initialized before use.
 */
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await initUndoStack();
  }
}

// =============================================================================
// Persistence
// =============================================================================

/**
 * Persist the undo stack to IndexedDB (debounced).
 */
function schedulePersist(): void {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
  }

  persistTimeout = setTimeout(async () => {
    try {
      await persistToStorage(undoStack);
      console.log(
        "[TabFlow] Undo stack persisted:",
        undoStack.length,
        "entries"
      );
    } catch (error) {
      console.error("[TabFlow] Failed to persist undo stack:", error);
    }
  }, UNDO_PERSIST_DEBOUNCE_MS);
}

/**
 * Force immediate persistence (e.g., before service worker terminates).
 */
export async function flushUndoStack(): Promise<void> {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
    persistTimeout = null;
  }

  try {
    await persistToStorage(undoStack);
    console.log("[TabFlow] Undo stack flushed");
  } catch (error) {
    console.error("[TabFlow] Failed to flush undo stack:", error);
  }
}

// =============================================================================
// Stack Operations
// =============================================================================

/**
 * Push an entry onto the undo stack.
 * Automatically caps at MAX_UNDO_DEPTH.
 */
export async function pushUndo(entry: UndoEntry): Promise<void> {
  await ensureInitialized();

  undoStack.push(entry);

  // Cap at max depth
  if (undoStack.length > MAX_UNDO_DEPTH) {
    undoStack = undoStack.slice(-MAX_UNDO_DEPTH);
  }

  schedulePersist();
}

/**
 * Pop the most recent entry from the undo stack.
 */
export async function popUndo(): Promise<UndoEntry | undefined> {
  await ensureInitialized();

  const entry = undoStack.pop();

  if (entry) {
    schedulePersist();
  }

  return entry;
}

/**
 * Peek at the most recent entry without removing it.
 */
export async function peekUndo(): Promise<UndoEntry | undefined> {
  await ensureInitialized();
  return undoStack[undoStack.length - 1];
}

/**
 * Get the current undo stack (for display).
 */
export async function getUndoStack(): Promise<UndoEntry[]> {
  await ensureInitialized();
  return [...undoStack];
}

/**
 * Get the number of entries in the undo stack.
 */
export async function getUndoStackSize(): Promise<number> {
  await ensureInitialized();
  return undoStack.length;
}

/**
 * Clear the undo stack.
 */
export async function clearUndo(): Promise<void> {
  await ensureInitialized();
  undoStack = [];
  schedulePersist();
}

// =============================================================================
// Undo Entry Creation Helpers
// =============================================================================

/**
 * Push an undo entry for saving a session.
 */
export async function pushSaveSessionUndo(sessionId: string): Promise<void> {
  const entry = createSaveSessionUndo(sessionId);
  await pushUndo(entry);
}

/**
 * Push an undo entry for deleting a session.
 */
export async function pushDeleteSessionUndo(session: Session): Promise<void> {
  const entry = createDeleteSessionUndo(session);
  await pushUndo(entry);
}

/**
 * Push an undo entry for renaming a session.
 */
export async function pushRenameSessionUndo(
  sessionId: string,
  oldName: string,
  newName: string
): Promise<void> {
  const entry = createRenameSessionUndo(sessionId, oldName, newName);
  await pushUndo(entry);
}

/**
 * Push an undo entry for importing data.
 */
export async function pushImportUndo(
  previousSessions: Session[]
): Promise<void> {
  const entry = createImportUndo(previousSessions);
  await pushUndo(entry);
}

// =============================================================================
// Undo Execution
// =============================================================================

/**
 * Execute the undo action for a given entry.
 * Reverses the original action.
 *
 * @param entry - The undo entry to execute
 * @returns Promise resolving to the undone entry
 */
export async function executeUndo(entry: UndoEntry): Promise<UndoEntry> {
  console.log("[TabFlow] Executing undo:", entry.type);

  switch (entry.type) {
    case "SAVE_SESSION": {
      // Undo save = delete the session
      const data = entry.data as { sessionId: string };
      await deleteSessionFromStorage(data.sessionId);
      break;
    }

    case "DELETE_SESSION": {
      // Undo delete = restore the session
      const data = entry.data as { session: Session };
      await saveSessionToStorage(data.session);
      break;
    }

    case "RENAME_SESSION": {
      // Undo rename = restore old name
      const data = entry.data as { sessionId: string; oldName: string };
      await updateSession(data.sessionId, { name: data.oldName });
      break;
    }

    case "APPLY_GROUPING": {
      // Undo grouping = restore previous session state
      const data = entry.data as { previousSession: Session };
      await saveSessionToStorage(data.previousSession);
      break;
    }

    case "IMPORT": {
      // Undo import = restore previous sessions
      const data = entry.data as { previousSessions: Session[] };
      await clearAllSessions();
      if (data.previousSessions.length > 0) {
        await importSessions(data.previousSessions, false);
      }
      break;
    }

    default:
      console.warn("[TabFlow] Unknown undo type:", entry.type);
  }

  return entry;
}

/**
 * Pop and execute the most recent undo action.
 *
 * @returns Promise resolving to the undone entry, or undefined if stack is empty
 */
export async function undoLastAction(): Promise<UndoEntry | undefined> {
  const entry = await popUndo();

  if (!entry) {
    console.log("[TabFlow] Nothing to undo");
    return undefined;
  }

  await executeUndo(entry);
  return entry;
}
