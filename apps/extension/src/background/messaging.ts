/**
 * TabFlow – Message Router
 *
 * Routes incoming messages from popup/options to appropriate handlers.
 * All Chrome API calls and storage operations are coordinated here.
 *
 * Architecture:
 * - All handlers are async
 * - All responses follow MessageResponse format
 * - Errors are caught and returned as { success: false, error: string }
 */

import {
  MessageAction,
  type Message,
  type MessageResponse,
  type SaveSessionPayload,
  type RestoreSessionPayload,
  type DeleteSessionPayload,
  type RenameSessionPayload,
  type ImportDataPayload,
} from "@shared/messages";
import type { Settings } from "@shared/types";
import { DEFAULT_SETTINGS } from "@shared/types";
import { MAX_SESSION_NAME_LENGTH } from "@shared/constants";

// Storage imports
import {
  getAllSessions,
  getSession,
  createSession,
  deleteSession,
  updateSession,
  clearAllSessions,
} from "@storage/sessions";
import { exportData, parseImportData, restoreFromBackup } from "@storage/backups";

// Background module imports
import { getCurrentWindowTabs, restoreSessionTabs } from "./tabCapture";
import {
  getUndoStack,
  undoLastAction,
  pushSaveSessionUndo,
  pushDeleteSessionUndo,
  pushRenameSessionUndo,
  pushImportUndo,
} from "./undo";
import {
  handleCloudUpload,
  handleCloudDownloadPreview,
  handleCloudApplyRestore,
} from "./cloudSync";

// =============================================================================
// Settings Helpers (chrome.storage.local)
// =============================================================================

/**
 * Get settings from chrome.storage.local.
 */
async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get("settings");
  return result.settings || DEFAULT_SETTINGS;
}

/**
 * Save settings to chrome.storage.local.
 */
async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

/**
 * Get user tier from chrome.storage.local.
 */
async function getTier(): Promise<"free" | "pro"> {
  const result = await chrome.storage.local.get("tier");
  return result.tier || "free";
}

// =============================================================================
// Message Handler
// =============================================================================

/**
 * Handle incoming messages from popup/options pages.
 * Routes to appropriate handler based on action.
 */
export async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  const { action, payload } = message;

  console.log("[TabFlow] Received message:", action);

  try {
    switch (action) {
      // =========================================================================
      // Session Management
      // =========================================================================

      case MessageAction.GET_SESSIONS: {
        const sessions = await getAllSessions();
        return { success: true, data: sessions };
      }

      case MessageAction.SAVE_SESSION: {
        const { name } = (payload as SaveSessionPayload) || {};

        // Capture current tabs
        const tabs = await getCurrentWindowTabs();

        if (tabs.length === 0) {
          return { success: false, error: "No tabs to save" };
        }

        // Create and save session
        const session = await createSession(name || `Session ${new Date().toLocaleString()}`, tabs);

        // Push undo entry
        await pushSaveSessionUndo(session.id);

        console.log("[TabFlow] Session saved:", session.id, "with", tabs.length, "tabs");
        return { success: true, data: session };
      }

      case MessageAction.RESTORE_SESSION: {
        const { sessionId } = payload as RestoreSessionPayload;

        if (!sessionId) {
          return { success: false, error: "Session ID required" };
        }

        // Get the session
        const session = await getSession(sessionId);

        if (!session) {
          return { success: false, error: "Session not found" };
        }

        // Restore tabs from all groups
        const tabsOpened = await restoreSessionTabs(session.groups);

        console.log("[TabFlow] Session restored:", sessionId, "opened", tabsOpened, "tabs");
        return { success: true, data: { tabsOpened } };
      }

      case MessageAction.DELETE_SESSION: {
        const { sessionId } = payload as DeleteSessionPayload;

        if (!sessionId) {
          return { success: false, error: "Session ID required" };
        }

        // Delete the session (returns deleted session for undo)
        const deletedSession = await deleteSession(sessionId);

        if (!deletedSession) {
          return { success: false, error: "Session not found" };
        }

        // Push undo entry with full session data
        await pushDeleteSessionUndo(deletedSession);

        console.log("[TabFlow] Session deleted:", sessionId);
        return { success: true, data: { success: true } };
      }

      case MessageAction.RENAME_SESSION: {
        const { sessionId, newName } = payload as RenameSessionPayload;

        if (!sessionId) {
          return { success: false, error: "Session ID required" };
        }

        if (!newName || newName.trim().length === 0) {
          return { success: false, error: "New name required" };
        }

        // Enforce max length
        const trimmedName = newName.trim().slice(0, MAX_SESSION_NAME_LENGTH);

        // Get current session to capture old name for undo
        const currentSession = await getSession(sessionId);
        if (!currentSession) {
          return { success: false, error: "Session not found" };
        }

        const oldName = currentSession.name;

        // Skip if name hasn't changed
        if (oldName === trimmedName) {
          return { success: true, data: { session: currentSession } };
        }

        // Update session name
        const updatedSession = await updateSession(sessionId, {
          name: trimmedName,
        });

        // Push undo entry
        await pushRenameSessionUndo(sessionId, oldName, trimmedName);

        console.log("[TabFlow] Session renamed:", sessionId, oldName, "->", trimmedName);
        return { success: true, data: { session: updatedSession } };
      }

      // =========================================================================
      // Undo
      // =========================================================================

      case MessageAction.UNDO: {
        const undone = await undoLastAction();

        if (!undone) {
          return { success: true, data: { undone: null } };
        }

        console.log("[TabFlow] Undo executed:", undone.type);
        return { success: true, data: { undone } };
      }

      case MessageAction.GET_UNDO_STACK: {
        const stack = await getUndoStack();
        return { success: true, data: stack };
      }

      // =========================================================================
      // Settings
      // =========================================================================

      case MessageAction.GET_SETTINGS: {
        const settings = await getSettings();
        return { success: true, data: settings };
      }

      case MessageAction.UPDATE_SETTINGS: {
        const newSettings = payload as Settings;

        if (!newSettings) {
          return { success: false, error: "Settings required" };
        }

        await saveSettings(newSettings);
        console.log("[TabFlow] Settings updated");
        return { success: true, data: { success: true } };
      }

      // =========================================================================
      // Backup / Export / Import
      // =========================================================================

      case MessageAction.EXPORT_DATA: {
        const settings = await getSettings();
        const json = await exportData(settings);
        console.log("[TabFlow] Data exported");
        return { success: true, data: json };
      }

      case MessageAction.IMPORT_DATA: {
        const { json } = payload as ImportDataPayload;

        if (!json) {
          return { success: false, error: "JSON data required" };
        }

        // Parse and validate
        let importBlob;
        try {
          importBlob = parseImportData(json);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Invalid import data",
          };
        }

        // Get current sessions for undo
        const previousSessions = await getAllSessions();

        // Clear and import
        const previousSessionsCopy = [...previousSessions];
        await restoreFromBackup(importBlob);

        // Push undo entry
        await pushImportUndo(previousSessionsCopy);

        console.log("[TabFlow] Data imported:", importBlob.sessions.length, "sessions");
        return {
          success: true,
          data: { sessionsImported: importBlob.sessions.length },
        };
      }

      case MessageAction.CLEAR_DATA: {
        // Get current sessions for undo
        const sessionsToDelete = await getAllSessions();

        // Clear all sessions
        await clearAllSessions();

        // Push undo entry so user can recover
        await pushImportUndo(sessionsToDelete);

        console.log("[TabFlow] All data cleared:", sessionsToDelete.length, "sessions");
        return { success: true, data: { success: true } };
      }

      // =========================================================================
      // Tier
      // =========================================================================

      case MessageAction.GET_TIER: {
        const tier = await getTier();
        return { success: true, data: tier };
      }

      // =========================================================================
      // Cloud Sync
      // =========================================================================

      case MessageAction.CLOUD_UPLOAD: {
        const result = await handleCloudUpload();

        if (!result.success) {
          return { success: false, error: result.error };
        }

        console.log("[TabFlow] Cloud upload successful:", result.syncedAt);
        return {
          success: true,
          data: { syncedAt: result.syncedAt },
        };
      }

      case MessageAction.CLOUD_DOWNLOAD_PREVIEW: {
        // Preview only - does NOT apply data
        const result = await handleCloudDownloadPreview();

        if (!result.success) {
          return { success: false, error: result.error };
        }

        if (!result.found) {
          console.log("[TabFlow] No cloud backup found");
          return {
            success: true,
            data: { found: false },
          };
        }

        console.log(
          "[TabFlow] Cloud preview ready:",
          result.preview.sessionCount,
          "sessions,",
          result.preview.totalTabs,
          "tabs"
        );

        return {
          success: true,
          data: {
            found: true,
            preview: result.preview,
          },
        };
      }

      case MessageAction.CLOUD_APPLY_RESTORE: {
        // Apply the previewed restore after user confirmation
        const { sessionsJson } = payload as { sessionsJson: string };

        if (!sessionsJson) {
          return { success: false, error: "Sessions data required" };
        }

        // Get current sessions for undo before applying
        const previousSessions = await getAllSessions();

        const result = await handleCloudApplyRestore(sessionsJson);

        if (!result.success) {
          return { success: false, error: result.error };
        }

        // Push undo entry so user can recover
        await pushImportUndo(previousSessions);

        console.log("[TabFlow] Cloud restore applied:", result.sessionsRestored, "sessions");

        return {
          success: true,
          data: { sessionsRestored: result.sessionsRestored },
        };
      }

      // =========================================================================
      // AI Grouping (Phase 2)
      // =========================================================================

      case MessageAction.TRIGGER_AI_GROUP: {
        return {
          success: false,
          error: "AI grouping not implemented (Phase 2)",
        };
      }

      case MessageAction.APPLY_GROUPING: {
        return {
          success: false,
          error: "AI grouping not implemented (Phase 2)",
        };
      }

      // =========================================================================
      // Unknown Action
      // =========================================================================

      default:
        console.warn("[TabFlow] Unknown action:", action);
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (error) {
    console.error("[TabFlow] Handler error:", action, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
