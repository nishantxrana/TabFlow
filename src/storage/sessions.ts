/**
 * TabFlow – Session Storage Operations
 *
 * CRUD operations for sessions in IndexedDB.
 */

import type { Session } from "@shared/types";

// =============================================================================
// Session CRUD (Placeholders)
// =============================================================================

/**
 * Get all sessions, sorted by creation date (newest first).
 */
export async function getAllSessions(): Promise<Session[]> {
  // TODO: Implement
  console.log("[TabFlow] getAllSessions called");
  return [];
}

/**
 * Get a single session by ID.
 */
export async function getSession(id: string): Promise<Session | undefined> {
  // TODO: Implement
  console.log("[TabFlow] getSession called:", id);
  return undefined;
}

/**
 * Save a session (insert or update).
 */
export async function saveSession(session: Session): Promise<void> {
  // TODO: Implement
  console.log("[TabFlow] saveSession called:", session.id);
}

/**
 * Delete a session by ID.
 * Returns the deleted session for undo purposes.
 */
export async function deleteSession(id: string): Promise<Session | undefined> {
  // TODO: Implement
  console.log("[TabFlow] deleteSession called:", id);
  return undefined;
}

/**
 * Delete all sessions.
 */
export async function clearAllSessions(): Promise<void> {
  // TODO: Implement
  console.log("[TabFlow] clearAllSessions called");
}

