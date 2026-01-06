/**
 * TabFlow – Message Router
 *
 * Routes incoming messages from popup/options to appropriate handlers.
 * All Chrome API calls and storage operations are handled here.
 */

import { MessageAction, type Message, type MessageResponse } from "@shared/messages";

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

  console.log("[TabFlow] Received message:", action, payload);

  switch (action) {
    // =========================================================================
    // Session Management
    // =========================================================================

    case MessageAction.GET_SESSIONS:
      // TODO: Implement - return all sessions from IndexedDB
      return { success: true, data: [] };

    case MessageAction.SAVE_SESSION:
      // TODO: Implement - capture tabs and save to IndexedDB
      return { success: false, error: "Not implemented" };

    case MessageAction.RESTORE_SESSION:
      // TODO: Implement - open tabs from session
      return { success: false, error: "Not implemented" };

    case MessageAction.DELETE_SESSION:
      // TODO: Implement - delete session from IndexedDB
      return { success: false, error: "Not implemented" };

    // =========================================================================
    // Undo
    // =========================================================================

    case MessageAction.UNDO:
      // TODO: Implement - pop and execute undo entry
      return { success: false, error: "Not implemented" };

    case MessageAction.GET_UNDO_STACK:
      // TODO: Implement - return current undo stack
      return { success: true, data: [] };

    // =========================================================================
    // Settings
    // =========================================================================

    case MessageAction.GET_SETTINGS:
      // TODO: Implement - return settings from chrome.storage.local
      return {
        success: true,
        data: {
          autoBackup: true,
          backupFrequencyHours: 1,
          aiOptIn: false,
        },
      };

    case MessageAction.UPDATE_SETTINGS:
      // TODO: Implement - save settings to chrome.storage.local
      return { success: true, data: { success: true } };

    // =========================================================================
    // Backup
    // =========================================================================

    case MessageAction.EXPORT_DATA:
      // TODO: Implement - export all data as JSON
      return { success: false, error: "Not implemented" };

    case MessageAction.IMPORT_DATA:
      // TODO: Implement - import data from JSON
      return { success: false, error: "Not implemented" };

    // =========================================================================
    // Tier
    // =========================================================================

    case MessageAction.GET_TIER:
      // TODO: Implement - return tier from chrome.storage.local
      return { success: true, data: "free" };

    // =========================================================================
    // AI Grouping (Phase 2)
    // =========================================================================

    case MessageAction.TRIGGER_AI_GROUP:
      return { success: false, error: "AI grouping not implemented (Phase 2)" };

    case MessageAction.APPLY_GROUPING:
      return { success: false, error: "AI grouping not implemented (Phase 2)" };

    // =========================================================================
    // Unknown Action
    // =========================================================================

    default:
      console.warn("[TabFlow] Unknown action:", action);
      return { success: false, error: `Unknown action: ${action}` };
  }
}

