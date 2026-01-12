/**
 * TabFlow – Cloud API Client
 *
 * Handles communication with the TabFlow cloud backend.
 * Uses Google authentication via chrome.identity.
 *
 * Architecture:
 * - All auth handled via auth.ts utility
 * - All requests go through this module
 * - No direct fetch calls from other modules
 *
 * Security:
 * - Never logs tokens or sensitive data
 * - Handles auth errors explicitly
 *
 * Development:
 * - When hitting localhost, uses X-DEV-USER-ID header instead of Google auth
 * - This bypasses OAuth issues with unpacked extensions
 */

import { CLOUD_API_BASE_URL } from "@shared/constants";
import { getAuthHeaders, clearAuthToken } from "./auth";

// =============================================================================
// Dev Mode Detection
// =============================================================================

/**
 * Check if we're hitting a local development server.
 */
function isLocalDev(): boolean {
  return CLOUD_API_BASE_URL.includes("localhost");
}

/**
 * Get auth headers for API requests.
 * Uses dev bypass for localhost, real Google auth for production.
 */
async function getApiHeaders(): Promise<{ headers: Record<string, string> }> {
  if (isLocalDev()) {
    console.log("[CloudApi] Using dev mode auth (localhost)");
    return {
      headers: {
        "X-DEV-USER-ID": "local-dev-user",
      },
    };
  }

  // Production: use real Google auth
  const authResult = await getAuthHeaders(true);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error, authResult.code);
  }
  return {
    headers: {
      Authorization: authResult.headers.Authorization,
    },
  };
}

// =============================================================================
// Types
// =============================================================================

export interface CloudUploadRequest {
  payload: string; // Base64 encrypted data
  schemaVersion: number;
  clientTimestamp: number;
}

export interface CloudUploadResponse {
  status: "ok";
  syncedAt: string;
}

export interface CloudDownloadResponse {
  payload: string;
  schemaVersion: number;
  lastSyncedAt: string;
}

export interface CloudApiError {
  error: string;
  code: string;
}

// =============================================================================
// Custom Errors
// =============================================================================

/**
 * Error thrown when authentication fails.
 */
export class AuthenticationError extends Error {
  code: string;

  constructor(message: string, code: string = "AUTH_FAILED") {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
  }
}

// =============================================================================
// API Client
// =============================================================================

/**
 * Upload encrypted data to cloud.
 *
 * @param request - Upload request with encrypted payload
 * @returns Promise resolving to upload response
 * @throws AuthenticationError if auth fails
 * @throws Error if upload fails
 */
export async function uploadToCloud(
  request: CloudUploadRequest
): Promise<CloudUploadResponse> {
  // Get auth headers (dev bypass or real Google auth)
  const { headers: authHeaders } = await getApiHeaders();

  const response = await fetch(`${CLOUD_API_BASE_URL}/sync/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(request),
  });

  // Handle 401 - clear token and prompt re-auth
  if (response.status === 401) {
    await clearAuthToken();
    throw new AuthenticationError(
      "Session expired. Please sign in again.",
      "SESSION_EXPIRED"
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = (errorBody as CloudApiError).error || "Upload failed";
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Download encrypted data from cloud.
 *
 * @returns Promise resolving to download response, or null if no data
 * @throws AuthenticationError if auth fails
 * @throws Error if download fails
 */
export async function downloadFromCloud(): Promise<CloudDownloadResponse | null> {
  // Get auth headers (dev bypass or real Google auth)
  const { headers: authHeaders } = await getApiHeaders();

  const response = await fetch(`${CLOUD_API_BASE_URL}/sync/download`, {
    method: "GET",
    headers: {
      ...authHeaders,
    },
  });

  // 204 = No content (no cloud backup)
  if (response.status === 204) {
    return null;
  }

  // Handle 401 - clear token and prompt re-auth
  if (response.status === 401) {
    await clearAuthToken();
    throw new AuthenticationError(
      "Session expired. Please sign in again.",
      "SESSION_EXPIRED"
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage =
      (errorBody as CloudApiError).error || "Download failed";
    throw new Error(errorMessage);
  }

  return response.json();
}
