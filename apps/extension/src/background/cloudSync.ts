/**
 * TabFlow – Cloud Sync Handler
 *
 * Orchestrates cloud upload and download operations.
 * Handles encryption, API calls, and data transformation.
 *
 * Design:
 * - Manual sync only (no auto-sync)
 * - Full snapshot upload/download
 * - Client-side encryption
 * - No merging or conflict resolution
 */

import type { Session, BackupBlob } from "@shared/types";
import { CLOUD_SYNC_SCHEMA_VERSION } from "@shared/constants";
import { getAllSessions } from "@storage/sessions";
import { restoreFromBackup, parseImportData } from "@storage/backups";
import { uploadToCloud, downloadFromCloud } from "./cloudApi";
import { encryptData, decryptData } from "./encryption";

// =============================================================================
// Types
// =============================================================================

export interface CloudUploadResult {
  success: true;
  syncedAt: string;
}

export interface CloudDownloadResult {
  success: true;
  found: true;
  sessions: Session[];
  lastSyncedAt: string;
}

export interface CloudDownloadNotFound {
  success: true;
  found: false;
}

export interface CloudSyncError {
  success: false;
  error: string;
}

export type UploadResult = CloudUploadResult | CloudSyncError;
export type DownloadResult = CloudDownloadResult | CloudDownloadNotFound | CloudSyncError;

// =============================================================================
// Upload Handler
// =============================================================================

/**
 * Upload current sessions to cloud.
 *
 * Flow:
 * 1. Get all local sessions
 * 2. Create backup blob
 * 3. Serialize to JSON
 * 4. Encrypt
 * 5. Upload to cloud
 *
 * @returns Promise resolving to upload result
 */
export async function handleCloudUpload(): Promise<UploadResult> {
  try {
    console.log("[CloudSync] Starting upload...");

    // 1. Get all sessions
    const sessions = await getAllSessions();
    console.log(`[CloudSync] Found ${sessions.length} sessions to upload`);

    // 2. Create backup blob
    const backupBlob: BackupBlob = {
      version: CLOUD_SYNC_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      sessions,
    };

    // 3. Serialize to JSON
    const json = JSON.stringify(backupBlob);

    // 4. Encrypt
    console.log("[CloudSync] Encrypting data...");
    const encryptedPayload = await encryptData(json);

    // 5. Upload to cloud
    console.log("[CloudSync] Uploading to cloud...");
    const response = await uploadToCloud({
      payload: encryptedPayload,
      schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
      clientTimestamp: Date.now(),
    });

    console.log("[CloudSync] Upload successful:", response.syncedAt);
    return {
      success: true,
      syncedAt: response.syncedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("[CloudSync] Upload error:", message);
    return {
      success: false,
      error: message,
    };
  }
}

// =============================================================================
// Download Handler
// =============================================================================

/**
 * Download sessions from cloud.
 *
 * Flow:
 * 1. Fetch from cloud
 * 2. If no data, return not found
 * 3. Decrypt payload
 * 4. Parse and validate backup blob
 * 5. Return sessions (caller decides whether to apply)
 *
 * Note: This does NOT automatically replace local data.
 * The caller (UI) should confirm with user before applying.
 *
 * @returns Promise resolving to download result
 */
export async function handleCloudDownload(): Promise<DownloadResult> {
  try {
    console.log("[CloudSync] Starting download...");

    // 1. Fetch from cloud
    const response = await downloadFromCloud();

    // 2. Check if data exists
    if (!response) {
      console.log("[CloudSync] No cloud backup found");
      return {
        success: true,
        found: false,
      };
    }

    console.log("[CloudSync] Downloaded data, decrypting...");

    // 3. Decrypt
    const decryptedJson = await decryptData(response.payload);

    // 4. Parse and validate
    const backupBlob = parseImportData(decryptedJson);

    console.log(
      `[CloudSync] Download successful: ${backupBlob.sessions.length} sessions`
    );

    return {
      success: true,
      found: true,
      sessions: backupBlob.sessions,
      lastSyncedAt: response.lastSyncedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed";
    console.error("[CloudSync] Download error:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Apply downloaded sessions to local storage.
 * Replaces all local sessions with cloud data.
 *
 * WARNING: This is destructive. Caller should confirm with user first.
 *
 * @param sessions - Sessions to apply
 * @returns Promise resolving to previous sessions (for undo)
 */
export async function applyCloudDownload(sessions: Session[]): Promise<Session[]> {
  console.log(`[CloudSync] Applying ${sessions.length} sessions from cloud`);

  const backupBlob: BackupBlob = {
    version: CLOUD_SYNC_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    sessions,
  };

  const previousSessions = await restoreFromBackup(backupBlob);
  console.log("[CloudSync] Cloud data applied successfully");

  return previousSessions;
}

