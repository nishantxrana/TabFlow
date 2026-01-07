/**
 * TabFlow – Message Passing Contracts
 * All message types used for communication between popup/options and background.
 */

import type { Session, Settings, UndoEntry, Tier } from "./types";

// =============================================================================
// Message Action Constants
// =============================================================================

/**
 * All supported message actions.
 * Background service worker handles these via messaging.ts router.
 */
export const MessageAction = {
  // Session management
  GET_SESSIONS: "GET_SESSIONS",
  SAVE_SESSION: "SAVE_SESSION",
  RESTORE_SESSION: "RESTORE_SESSION",
  DELETE_SESSION: "DELETE_SESSION",
  RENAME_SESSION: "RENAME_SESSION",

  // Grouping (AI - Phase 2)
  TRIGGER_AI_GROUP: "TRIGGER_AI_GROUP",
  APPLY_GROUPING: "APPLY_GROUPING",

  // Undo
  UNDO: "UNDO",
  GET_UNDO_STACK: "GET_UNDO_STACK",

  // Settings
  GET_SETTINGS: "GET_SETTINGS",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",

  // Backup
  EXPORT_DATA: "EXPORT_DATA",
  IMPORT_DATA: "IMPORT_DATA",
  CLEAR_DATA: "CLEAR_DATA",

  // Tier
  GET_TIER: "GET_TIER",
} as const;

export type MessageActionType = (typeof MessageAction)[keyof typeof MessageAction];

// =============================================================================
// Message Request Types
// =============================================================================

/**
 * Generic message shape sent from popup/options to background.
 */
export interface Message<T = unknown> {
  action: MessageActionType;
  payload?: T;
}

// =============================================================================
// Message Response Types
// =============================================================================

/**
 * Generic response shape from background to popup/options.
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// Payload Types (Request)
// =============================================================================

export interface SaveSessionPayload {
  name?: string;
}

export interface RestoreSessionPayload {
  sessionId: string;
}

export interface DeleteSessionPayload {
  sessionId: string;
}

export interface RenameSessionPayload {
  sessionId: string;
  newName: string;
}

export interface ImportDataPayload {
  json: string;
}

// =============================================================================
// Response Data Types
// =============================================================================

export interface RestoreSessionResponse {
  tabsOpened: number;
}

export interface DeleteSessionResponse {
  success: true;
}

export interface RenameSessionResponse {
  session: Session;
}

export interface UndoResponse {
  undone: UndoEntry | null;
}

export interface UpdateSettingsResponse {
  success: true;
}

export interface ImportDataResponse {
  sessionsImported: number;
}

export interface ClearDataResponse {
  success: true;
}

// =============================================================================
// Type-Safe Message Helpers
// =============================================================================

/**
 * Type mapping for action -> response data type.
 * Used for type inference in sendMessage helper.
 */
export interface MessageResponseMap {
  [MessageAction.GET_SESSIONS]: Session[];
  [MessageAction.SAVE_SESSION]: Session;
  [MessageAction.RESTORE_SESSION]: RestoreSessionResponse;
  [MessageAction.DELETE_SESSION]: DeleteSessionResponse;
  [MessageAction.RENAME_SESSION]: RenameSessionResponse;
  [MessageAction.UNDO]: UndoResponse;
  [MessageAction.GET_UNDO_STACK]: UndoEntry[];
  [MessageAction.GET_SETTINGS]: Settings;
  [MessageAction.UPDATE_SETTINGS]: UpdateSettingsResponse;
  [MessageAction.EXPORT_DATA]: string;
  [MessageAction.IMPORT_DATA]: ImportDataResponse;
  [MessageAction.CLEAR_DATA]: ClearDataResponse;
  [MessageAction.GET_TIER]: Tier;
  // AI actions (Phase 2)
  [MessageAction.TRIGGER_AI_GROUP]: unknown;
  [MessageAction.APPLY_GROUPING]: Session;
}

