/**
 * TabFlow – Undo Stack Persistence
 *
 * Persists and loads undo stack from IndexedDB.
 */

import type { UndoEntry } from "@shared/types";

// =============================================================================
// Undo Stack Persistence (Placeholders)
// =============================================================================

/**
 * Load the undo stack from IndexedDB.
 * Called on service worker wake-up.
 */
export async function loadUndoStack(): Promise<UndoEntry[]> {
  // TODO: Implement
  console.log("[TabFlow] loadUndoStack called");
  return [];
}

/**
 * Persist the undo stack to IndexedDB.
 * Called after every push/pop (debounced).
 */
export async function persistUndoStack(stack: UndoEntry[]): Promise<void> {
  // TODO: Implement
  console.log("[TabFlow] persistUndoStack called:", stack.length, "entries");
}

