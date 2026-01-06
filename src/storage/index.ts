/**
 * TabFlow – Storage Module Barrel Export
 *
 * This module provides all storage functionality for TabFlow.
 * Only the background service worker should import from this module.
 *
 * Usage:
 *   import { getDB, getAllSessions, pushUndoEntry } from '@storage';
 *
 * Architecture:
 * - db.ts: Database connection and error handling
 * - sessions.ts: Session CRUD operations
 * - undoStore.ts: Undo stack persistence
 * - backups.ts: Backup and export/import operations
 */

// Database connection and utilities
export {
  getDB,
  closeDB,
  resetDBConnection,
  StorageError,
  withErrorHandling,
  generateId,
  now,
  type TabFlowDB,
  type TabFlowDBSchema,
  type StorageErrorCode,
} from "./db";

// Session operations
export {
  // Read
  getAllSessions,
  getSession,
  sessionExists,
  getSessionCount,
  getTotalTabCount,
  // Write
  saveSession,
  createSession,
  updateSession,
  deleteSession,
  clearAllSessions,
  // Group operations
  addGroupToSession,
  updateGroupInSession,
  deleteGroupFromSession,
  // Batch operations
  importSessions,
  replaceSessionGroups,
} from "./sessions";

// Undo stack operations
export {
  // Read
  loadUndoStack,
  getUndoStackSize,
  peekUndoStack,
  // Write
  pushUndoEntry,
  popUndoEntry,
  clearUndoStack,
  persistUndoStack,
  // Helpers
  createSaveSessionUndo,
  createDeleteSessionUndo,
  createApplyGroupingUndo,
  createImportUndo,
} from "./undoStore";

// Backup operations
export {
  // Read
  getLatestBackup,
  getAllBackups,
  getBackup,
  getBackupCount,
  // Write
  createBackup,
  deleteBackup,
  pruneOldBackups,
  clearAllBackups,
  // Export/Import
  exportData,
  parseImportData,
  // Restore
  restoreFromBackup,
} from "./backups";
