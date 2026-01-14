/**
 * TabFlow API – Azure Blob Storage Utilities
 *
 * Handles encrypted blob storage for user sync data.
 *
 * Security:
 * - Never log or inspect payload contents
 * - Payloads are client-encrypted, server treats as opaque
 * - One blob per user (overwrite on upload)
 */

import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

// =============================================================================
// Types
// =============================================================================

export interface SyncBlob {
  payload: string; // Base64 encrypted data (opaque)
  schemaVersion: number;
  clientTimestamp: number;
  serverTimestamp: number;
}

export interface UploadResult {
  success: true;
  syncedAt: string;
}

export interface StorageError {
  success: false;
  error: string;
  code: "CONFIG_ERROR" | "UPLOAD_FAILED" | "DOWNLOAD_FAILED" | "CONTAINER_ERROR";
}

export type UploadBlobResult = UploadResult | StorageError;

export interface DownloadResult {
  success: true;
  found: true;
  payload: string;
  schemaVersion: number;
  lastSyncedAt: string;
}

export interface DownloadNotFound {
  success: true;
  found: false;
}

export interface DownloadError {
  success: false;
  error: string;
  code: "CONFIG_ERROR" | "DOWNLOAD_FAILED";
}

export type DownloadBlobResult = DownloadResult | DownloadNotFound | DownloadError;

// =============================================================================
// Configuration
// =============================================================================

/**
 * Get storage configuration from environment.
 */
function getStorageConfig(): {
  connectionString: string;
  containerName: string;
} {
  const connectionString = process.env.STORAGE_CONNECTION_STRING;
  const containerName = process.env.BLOB_CONTAINER_NAME || "tabflow-sync";

  if (!connectionString) {
    throw new Error("STORAGE_CONNECTION_STRING environment variable is not set");
  }

  return { connectionString, containerName };
}

/**
 * Get blob service client.
 */
function getBlobServiceClient(): BlobServiceClient {
  const { connectionString } = getStorageConfig();
  return BlobServiceClient.fromConnectionString(connectionString);
}

/**
 * Get or create container client.
 * Creates the container if it doesn't exist.
 */
async function getContainerClient(): Promise<ContainerClient> {
  const blobServiceClient = getBlobServiceClient();
  const { containerName } = getStorageConfig();
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Create container if it doesn't exist
  await containerClient.createIfNotExists({
    access: undefined, // Private access only
  });

  return containerClient;
}

// =============================================================================
// Blob Operations
// =============================================================================

/**
 * Generate the blob path for a user's sync data.
 *
 * Path format: users/{userId}/sessions.enc.json
 */
function getUserBlobPath(userId: string): string {
  // Sanitize userId (should already be a hex hash, but be defensive)
  const safeUserId = userId.replace(/[^a-f0-9]/gi, "");
  return `users/${safeUserId}/sessions.enc.json`;
}

/**
 * Upload encrypted sync data for a user.
 *
 * - Overwrites existing blob if present
 * - Does NOT inspect or log payload contents
 *
 * @param userId - Internal user ID (derived from auth)
 * @param payload - Base64 encrypted data (opaque)
 * @param schemaVersion - Client schema version
 * @param clientTimestamp - Client-provided timestamp
 */
export async function uploadSyncBlob(
  userId: string,
  payload: string,
  schemaVersion: number,
  clientTimestamp: number
): Promise<UploadBlobResult> {
  try {
    const containerClient = await getContainerClient();
    const blobPath = getUserBlobPath(userId);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

    // Current server timestamp
    const serverTimestamp = Date.now();
    const syncedAt = new Date(serverTimestamp).toISOString();

    // Build blob content (DO NOT log this)
    const blobContent: SyncBlob = {
      payload,
      schemaVersion,
      clientTimestamp,
      serverTimestamp,
    };

    const content = JSON.stringify(blobContent);

    // Upload with overwrite
    await blockBlobClient.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: {
        blobContentType: "application/json",
      },
      metadata: {
        schemaVersion: String(schemaVersion),
        uploadedAt: syncedAt,
      },
    });

    return {
      success: true,
      syncedAt,
    };
  } catch (error) {
    // Only log error type, not full message (could contain connection strings)
    const errorType = error instanceof Error ? error.name : "Unknown";
    console.error(`[Storage] UPLOAD_ERROR: type=${errorType}`);

    return {
      success: false,
      error: "Failed to upload sync data",
      code: "UPLOAD_FAILED",
    };
  }
}

/**
 * Check if a user has sync data.
 *
 * @param userId - Internal user ID
 * @returns true if blob exists
 */
export async function hasSyncBlob(userId: string): Promise<boolean> {
  try {
    const containerClient = await getContainerClient();
    const blobPath = getUserBlobPath(userId);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    return await blockBlobClient.exists();
  } catch {
    return false;
  }
}

/**
 * Download encrypted sync data for a user.
 *
 * - Returns the payload exactly as stored (opaque)
 * - Does NOT decrypt or inspect payload
 * - Returns { found: false } if blob doesn't exist
 *
 * @param userId - Internal user ID (derived from auth)
 */
export async function downloadSyncBlob(userId: string): Promise<DownloadBlobResult> {
  try {
    const blobServiceClient = getBlobServiceClient();
    const { containerName } = getStorageConfig();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Check if container exists first
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      return { success: true, found: false };
    }

    const blobPath = getUserBlobPath(userId);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return { success: true, found: false };
    }

    // Download blob content
    const downloadResponse = await blockBlobClient.download(0);
    const downloadedContent = await streamToString(downloadResponse.readableStreamBody);

    // Parse stored blob (DO NOT log payload)
    const blobData: SyncBlob = JSON.parse(downloadedContent);

    // Get last modified timestamp
    const properties = await blockBlobClient.getProperties();
    const lastSyncedAt = properties.lastModified?.toISOString() || new Date().toISOString();

    return {
      success: true,
      found: true,
      payload: blobData.payload,
      schemaVersion: blobData.schemaVersion,
      lastSyncedAt,
    };
  } catch (error) {
    // Only log error type, not full message (could contain connection strings)
    const errorType = error instanceof Error ? error.name : "Unknown";
    console.error(`[Storage] DOWNLOAD_ERROR: type=${errorType}`);

    return {
      success: false,
      error: "Failed to download sync data",
      code: "DOWNLOAD_FAILED",
    };
  }
}

/**
 * Helper to convert a readable stream to string.
 */
async function streamToString(readableStream: NodeJS.ReadableStream | undefined): Promise<string> {
  if (!readableStream) {
    return "";
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on("data", (data) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    readableStream.on("error", reject);
  });
}
