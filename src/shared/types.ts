/**
 * TabFlow – Shared Type Definitions
 * All core interfaces used across background, popup, and options.
 */

// =============================================================================
// Tab & Session Types
// =============================================================================

/**
 * Snapshot of a browser tab's metadata.
 * Does NOT include page content – only title, URL, and metadata.
 */
export interface TabSnapshot {
  title: string;
  url: string;
  domain: string;
  favicon: string;
  lastAccessed: number;
}

/**
 * A named group of tabs within a session.
 */
export interface Group {
  id: string;
  name: string;
  tabs: TabSnapshot[];
}

/**
 * A saved session containing groups of tabs.
 */
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  groups: Group[];
}

// =============================================================================
// Undo Types
// =============================================================================

/**
 * Types of actions that can be undone.
 */
export type UndoEntryType =
  | "SAVE_SESSION"
  | "DELETE_SESSION"
  | "APPLY_GROUPING"
  | "IMPORT";

/**
 * Base undo entry structure.
 */
export interface UndoEntry {
  type: UndoEntryType;
  timestamp: number;
  data: unknown;
}

/**
 * Undo entry for saving a session.
 */
export interface SaveSessionUndo extends UndoEntry {
  type: "SAVE_SESSION";
  data: {
    sessionId: string;
  };
}

/**
 * Undo entry for deleting a session.
 */
export interface DeleteSessionUndo extends UndoEntry {
  type: "DELETE_SESSION";
  data: {
    session: Session;
  };
}

/**
 * Undo entry for applying AI grouping.
 */
export interface ApplyGroupingUndo extends UndoEntry {
  type: "APPLY_GROUPING";
  data: {
    previousSession: Session;
  };
}

/**
 * Undo entry for importing data.
 */
export interface ImportUndo extends UndoEntry {
  type: "IMPORT";
  data: {
    previousSessions: Session[];
  };
}

// =============================================================================
// Settings Types
// =============================================================================

/**
 * User settings stored in chrome.storage.local.
 */
export interface Settings {
  autoBackup: boolean;
  backupFrequencyHours: number;
  aiOptIn: boolean;
}

/**
 * Default settings values.
 */
export const DEFAULT_SETTINGS: Settings = {
  autoBackup: true,
  backupFrequencyHours: 1,
  aiOptIn: false,
};

// =============================================================================
// Backup Types
// =============================================================================

/**
 * A backup blob containing all user data.
 */
export interface BackupBlob {
  version: number;
  timestamp: string;
  sessions: Session[];
  settings?: Settings;
}

// =============================================================================
// Tier Types
// =============================================================================

/**
 * User tier (Free or Pro).
 */
export type Tier = "free" | "pro";

