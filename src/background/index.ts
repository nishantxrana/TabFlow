/**
 * TabFlow – Background Service Worker Entry Point
 *
 * This is the authoritative layer for all Chrome API interactions.
 * Popup and Options pages communicate with this via chrome.runtime.sendMessage.
 *
 * Responsibilities:
 * - Register chrome.runtime.onInstalled → run migrations
 * - Register chrome.runtime.onMessage → route to messaging handler
 * - Register chrome.alarms.onAlarm → trigger backup
 * - Rehydrate undo stack from IndexedDB on wake-up
 * - Initialize DB connection
 */

import { handleMessage } from "./messaging";

// =============================================================================
// Installation Handler
// =============================================================================

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[TabFlow] Extension installed:", details.reason);

  if (details.reason === "install") {
    // First-time installation
    console.log("[TabFlow] First-time setup complete");
  } else if (details.reason === "update") {
    // Extension updated
    console.log("[TabFlow] Updated to version:", chrome.runtime.getManifest().version);
  }

  // TODO: Initialize storage schema if needed
  // TODO: Set up hourly backup alarm
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
  console.log("[TabFlow] Alarm fired:", alarm.name);

  // TODO: Handle hourly backup alarm
  // if (alarm.name === ALARM_HOURLY_BACKUP) {
  //   createBackup();
  // }
});

// =============================================================================
// Service Worker Lifecycle
// =============================================================================

// Log when service worker starts
console.log("[TabFlow] Background service worker started");

// TODO: Rehydrate undo stack from IndexedDB
// TODO: Initialize DB connection

