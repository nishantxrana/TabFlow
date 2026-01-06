/**
 * TabFlow – Background Service Worker Entry Point
 *
 * This is the authoritative layer for all Chrome API interactions.
 * Popup and Options pages communicate with this via chrome.runtime.sendMessage.
 *
 * Lifecycle:
 * - Service worker is ephemeral (Chrome terminates after ~30s of inactivity)
 * - State must be rehydrated on every wake-up
 * - All persistent state lives in IndexedDB or chrome.storage.local
 *
 * Responsibilities:
 * - Register chrome.runtime.onInstalled → run setup
 * - Register chrome.runtime.onMessage → route to messaging handler
 * - Register chrome.alarms.onAlarm → trigger backup
 * - Rehydrate undo stack from IndexedDB on wake-up
 * - Initialize DB connection
 */

import { handleMessage } from "./messaging";
import { initUndoStack, flushUndoStack } from "./undo";
import { setupBackupAlarm, handleAlarm } from "./alarms";
import { getDB } from "@storage/db";

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the service worker.
 * Called on every wake-up.
 */
async function initialize(): Promise<void> {
  console.log("[TabFlow] Initializing service worker...");

  try {
    // Initialize database connection
    await getDB();
    console.log("[TabFlow] Database connection established");

    // Rehydrate undo stack
    await initUndoStack();
    console.log("[TabFlow] Undo stack rehydrated");
  } catch (error) {
    console.error("[TabFlow] Initialization error:", error);
  }
}

// Run initialization immediately
initialize();

// =============================================================================
// Installation Handler
// =============================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[TabFlow] Extension installed:", details.reason);

  if (details.reason === "install") {
    // First-time installation
    console.log("[TabFlow] First-time setup...");

    // Initialize database schema
    await getDB();

    // Set up backup alarm
    await setupBackupAlarm();

    // Set default settings
    const result = await chrome.storage.local.get("settings");
    if (!result.settings) {
      await chrome.storage.local.set({
        settings: {
          autoBackup: true,
          backupFrequencyHours: 1,
          aiOptIn: false,
        },
      });
    }

    // Set default tier
    const tierResult = await chrome.storage.local.get("tier");
    if (!tierResult.tier) {
      await chrome.storage.local.set({ tier: "free" });
    }

    console.log("[TabFlow] First-time setup complete");
  } else if (details.reason === "update") {
    // Extension updated
    console.log(
      "[TabFlow] Updated to version:",
      chrome.runtime.getManifest().version
    );

    // Ensure backup alarm exists after update
    await setupBackupAlarm();
  }
});

// =============================================================================
// Message Handler
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message asynchronously
  handleMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) => {
      console.error("[TabFlow] Message handler error:", error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });

  // Return true to indicate async response
  return true;
});

// =============================================================================
// Alarm Handler
// =============================================================================

chrome.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm).catch((error) => {
    console.error("[TabFlow] Alarm handler error:", error);
  });
});

// =============================================================================
// Service Worker Lifecycle Events
// =============================================================================

// Log when service worker starts
console.log("[TabFlow] Background service worker started");

// Handle service worker suspension (best-effort)
// Note: This may not always fire in Manifest V3
self.addEventListener("beforeunload", () => {
  console.log("[TabFlow] Service worker suspending...");
  flushUndoStack().catch(console.error);
});

// =============================================================================
// Export for testing
// =============================================================================

export { initialize };
