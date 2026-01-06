/**
 * TabFlow – Session Storage Operations
 *
 * CRUD operations for sessions in IndexedDB.
 * All operations use single transactions and proper error handling.
 *
 * Transaction Boundaries:
 * - Each operation opens and closes its own transaction
 * - Transactions are kept short (no network calls during transaction)
 * - Read operations use 'readonly' mode
 * - Write operations use 'readwrite' mode
 */

import type { Session, Group, TabSnapshot } from "@shared/types";
import {
  getDB,
  StorageError,
  withErrorHandling,
  generateId,
  now,
} from "./db";

// =============================================================================
// Session Read Operations
// =============================================================================

/**
 * Get all sessions, sorted by creation date (newest first).
 *
 * @returns Promise resolving to array of sessions
 * @throws StorageError if read fails
 */
export async function getAllSessions(): Promise<Session[]> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readonly");
    const index = tx.store.index("byCreatedAt");

    // Get all sessions sorted by createdAt (ascending)
    const sessions = await index.getAll();

    await tx.done;

    // Return sorted newest first
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  }, "get all sessions");
}

/**
 * Get a single session by ID.
 *
 * @param id - Session ID
 * @returns Promise resolving to session or undefined if not found
 * @throws StorageError if read fails
 */
export async function getSession(id: string): Promise<Session | undefined> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readonly");
    const session = await tx.store.get(id);
    await tx.done;
    return session;
  }, `get session ${id}`);
}

/**
 * Check if a session exists by ID.
 *
 * @param id - Session ID
 * @returns Promise resolving to boolean
 * @throws StorageError if read fails
 */
export async function sessionExists(id: string): Promise<boolean> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readonly");
    const key = await tx.store.getKey(id);
    await tx.done;
    return key !== undefined;
  }, `check session exists ${id}`);
}

/**
 * Get total count of sessions.
 *
 * @returns Promise resolving to session count
 * @throws StorageError if read fails
 */
export async function getSessionCount(): Promise<number> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readonly");
    const count = await tx.store.count();
    await tx.done;
    return count;
  }, "get session count");
}

/**
 * Get total count of tabs across all sessions.
 * Useful for enforcing free tier limits.
 *
 * @returns Promise resolving to total tab count
 * @throws StorageError if read fails
 */
export async function getTotalTabCount(): Promise<number> {
  return withErrorHandling(async () => {
    const sessions = await getAllSessions();
    return sessions.reduce((total, session) => {
      return (
        total +
        session.groups.reduce((groupTotal, group) => {
          return groupTotal + group.tabs.length;
        }, 0)
      );
    }, 0);
  }, "get total tab count");
}

// =============================================================================
// Session Write Operations
// =============================================================================

/**
 * Save a session (insert or update).
 * If session.id exists, it will be updated; otherwise inserted.
 *
 * @param session - Session to save
 * @throws StorageError if write fails
 */
export async function saveSession(session: Session): Promise<void> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");
    await tx.store.put(session);
    await tx.done;
  }, `save session ${session.id}`);
}

/**
 * Create a new session with the given tabs.
 * Automatically generates ID and timestamp.
 *
 * @param name - Session name
 * @param tabs - Array of tab snapshots
 * @returns Promise resolving to the created session
 * @throws StorageError if write fails
 */
export async function createSession(
  name: string,
  tabs: TabSnapshot[]
): Promise<Session> {
  const session: Session = {
    id: generateId(),
    name: name || `Session ${new Date().toLocaleString()}`,
    createdAt: now(),
    groups: [
      {
        id: generateId(),
        name: "All Tabs",
        tabs: tabs,
      },
    ],
  };

  await saveSession(session);
  return session;
}

/**
 * Update an existing session.
 * Throws if session doesn't exist.
 *
 * @param id - Session ID
 * @param updates - Partial session updates
 * @returns Promise resolving to updated session
 * @throws StorageError if session not found or write fails
 */
export async function updateSession(
  id: string,
  updates: Partial<Omit<Session, "id">>
): Promise<Session> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");

    const existing = await tx.store.get(id);
    if (!existing) {
      await tx.done;
      throw new StorageError(`Session not found: ${id}`, "NOT_FOUND");
    }

    const updated: Session = {
      ...existing,
      ...updates,
    };

    await tx.store.put(updated);
    await tx.done;

    return updated;
  }, `update session ${id}`);
}

/**
 * Delete a session by ID.
 * Returns the deleted session for undo purposes.
 *
 * @param id - Session ID
 * @returns Promise resolving to deleted session, or undefined if not found
 * @throws StorageError if delete fails
 */
export async function deleteSession(id: string): Promise<Session | undefined> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");

    // Get existing session for undo
    const existing = await tx.store.get(id);

    if (existing) {
      await tx.store.delete(id);
    }

    await tx.done;
    return existing;
  }, `delete session ${id}`);
}

/**
 * Delete all sessions.
 * Returns all deleted sessions for undo purposes.
 *
 * @returns Promise resolving to array of deleted sessions
 * @throws StorageError if clear fails
 */
export async function clearAllSessions(): Promise<Session[]> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");

    // Get all sessions first for undo
    const sessions = await tx.store.getAll();

    // Clear the store
    await tx.store.clear();
    await tx.done;

    return sessions;
  }, "clear all sessions");
}

// =============================================================================
// Group Operations (within a session)
// =============================================================================

/**
 * Add a group to a session.
 *
 * @param sessionId - Session ID
 * @param group - Group to add
 * @returns Promise resolving to updated session
 * @throws StorageError if session not found or write fails
 */
export async function addGroupToSession(
  sessionId: string,
  group: Omit<Group, "id">
): Promise<Session> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");

    const session = await tx.store.get(sessionId);
    if (!session) {
      await tx.done;
      throw new StorageError(`Session not found: ${sessionId}`, "NOT_FOUND");
    }

    const newGroup: Group = {
      ...group,
      id: generateId(),
    };

    session.groups.push(newGroup);
    await tx.store.put(session);
    await tx.done;

    return session;
  }, `add group to session ${sessionId}`);
}

/**
 * Update a group within a session.
 *
 * @param sessionId - Session ID
 * @param groupId - Group ID
 * @param updates - Partial group updates
 * @returns Promise resolving to updated session
 * @throws StorageError if session or group not found
 */
export async function updateGroupInSession(
  sessionId: string,
  groupId: string,
  updates: Partial<Omit<Group, "id">>
): Promise<Session> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");

    const session = await tx.store.get(sessionId);
    if (!session) {
      await tx.done;
      throw new StorageError(`Session not found: ${sessionId}`, "NOT_FOUND");
    }

    const groupIndex = session.groups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) {
      await tx.done;
      throw new StorageError(
        `Group not found: ${groupId} in session ${sessionId}`,
        "NOT_FOUND"
      );
    }

    session.groups[groupIndex] = {
      ...session.groups[groupIndex],
      ...updates,
    };

    await tx.store.put(session);
    await tx.done;

    return session;
  }, `update group ${groupId} in session ${sessionId}`);
}

/**
 * Delete a group from a session.
 *
 * @param sessionId - Session ID
 * @param groupId - Group ID
 * @returns Promise resolving to updated session
 * @throws StorageError if session not found
 */
export async function deleteGroupFromSession(
  sessionId: string,
  groupId: string
): Promise<Session> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");

    const session = await tx.store.get(sessionId);
    if (!session) {
      await tx.done;
      throw new StorageError(`Session not found: ${sessionId}`, "NOT_FOUND");
    }

    session.groups = session.groups.filter((g) => g.id !== groupId);

    await tx.store.put(session);
    await tx.done;

    return session;
  }, `delete group ${groupId} from session ${sessionId}`);
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Import multiple sessions at once.
 * Clears existing sessions and imports new ones in a single transaction.
 *
 * @param sessions - Sessions to import
 * @param clearExisting - Whether to clear existing sessions first (default: true)
 * @returns Promise resolving to number of sessions imported
 * @throws StorageError if import fails
 */
export async function importSessions(
  sessions: Session[],
  clearExisting: boolean = true
): Promise<number> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");

    if (clearExisting) {
      await tx.store.clear();
    }

    // Import all sessions
    for (const session of sessions) {
      // Ensure each session has a valid ID
      const sessionToSave: Session = {
        ...session,
        id: session.id || generateId(),
      };
      await tx.store.put(sessionToSave);
    }

    await tx.done;
    return sessions.length;
  }, "import sessions");
}

/**
 * Replace all groups in a session with new groups.
 * Used when applying AI grouping results.
 *
 * @param sessionId - Session ID
 * @param groups - New groups to replace existing
 * @returns Promise resolving to previous session state (for undo)
 * @throws StorageError if session not found
 */
export async function replaceSessionGroups(
  sessionId: string,
  groups: Group[]
): Promise<Session> {
  return withErrorHandling(async () => {
    const db = await getDB();
    const tx = db.transaction("sessions", "readwrite");

    const session = await tx.store.get(sessionId);
    if (!session) {
      await tx.done;
      throw new StorageError(`Session not found: ${sessionId}`, "NOT_FOUND");
    }

    // Store previous state for undo
    const previousSession = { ...session };

    // Ensure all groups have IDs
    session.groups = groups.map((group) => ({
      ...group,
      id: group.id || generateId(),
    }));

    await tx.store.put(session);
    await tx.done;

    return previousSession;
  }, `replace groups in session ${sessionId}`);
}
