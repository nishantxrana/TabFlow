/**
 * TabFlow – Chrome Alarms Module
 *
 * Handles scheduled tasks using chrome.alarms API.
 * Currently used for automatic hourly backups.
 *
 * Design:
 * - Alarms persist across service worker restarts
 * - Alarm names are constants to prevent typos
 * - All scheduled work goes through this module
 */

import {
  ALARM_HOURLY_BACKUP,
  BACKUP_INTERVAL_MINUTES,
} from "@shared/constants";
import { createBackup } from "@storage/backups";

// =============================================================================
// Alarm Setup
// =============================================================================

/**
 * Set up the hourly backup alarm.
 * Called on extension install and update.
 */
export async function setupBackupAlarm(): Promise<void> {
  // Check if alarm already exists
  const existingAlarm = await chrome.alarms.get(ALARM_HOURLY_BACKUP);

  if (existingAlarm) {
    console.log("[TabFlow] Backup alarm already exists");
    return;
  }

  // Create the alarm
  await chrome.alarms.create(ALARM_HOURLY_BACKUP, {
    delayInMinutes: BACKUP_INTERVAL_MINUTES,
    periodInMinutes: BACKUP_INTERVAL_MINUTES,
  });

  console.log(
    "[TabFlow] Backup alarm created, interval:",
    BACKUP_INTERVAL_MINUTES,
    "minutes"
  );
}

/**
 * Clear the backup alarm.
 */
export async function clearBackupAlarm(): Promise<void> {
  await chrome.alarms.clear(ALARM_HOURLY_BACKUP);
  console.log("[TabFlow] Backup alarm cleared");
}

// =============================================================================
// Alarm Handler
// =============================================================================

/**
 * Handle alarm events.
 * Called when any alarm fires.
 *
 * @param alarm - The alarm that fired
 */
export async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  console.log("[TabFlow] Alarm fired:", alarm.name);

  switch (alarm.name) {
    case ALARM_HOURLY_BACKUP:
      await handleBackupAlarm();
      break;

    default:
      console.warn("[TabFlow] Unknown alarm:", alarm.name);
  }
}

/**
 * Handle the hourly backup alarm.
 */
async function handleBackupAlarm(): Promise<void> {
  try {
    const backup = await createBackup();
    console.log("[TabFlow] Automatic backup created:", backup.timestamp);
  } catch (error) {
    console.error("[TabFlow] Automatic backup failed:", error);
  }
}

// =============================================================================
// Manual Backup Trigger
// =============================================================================

/**
 * Trigger an immediate backup (outside of scheduled time).
 */
export async function triggerManualBackup(): Promise<void> {
  try {
    const backup = await createBackup();
    console.log("[TabFlow] Manual backup created:", backup.timestamp);
  } catch (error) {
    console.error("[TabFlow] Manual backup failed:", error);
    throw error;
  }
}
