/**
 * TabFlow – Cloud API Client
 *
 * Handles communication with the TabFlow cloud backend.
 * Abstracted auth layer allows swapping dev mode for Google auth later.
 *
 * Architecture:
 * - Auth provider abstraction (currently dev mode, later Google)
 * - All requests go through this module
 * - No direct fetch calls from other modules
 */

import { CLOUD_API_BASE_URL } from "@shared/constants";

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
// Auth Provider Abstraction
// =============================================================================

/**
 * Auth provider interface.
 * Allows swapping between dev mode and Google auth.
 */
interface AuthProvider {
  getAuthHeaders(): Promise<Record<string, string>>;
}

/**
 * Dev mode auth provider.
 * Uses X-DEV-USER-ID header for local testing.
 *
 * TODO: Replace with GoogleAuthProvider when implementing real auth.
 */
class DevAuthProvider implements AuthProvider {
  private userId: string;

  constructor(userId: string = "extension-dev-user") {
    this.userId = userId;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    return {
      "X-DEV-USER-ID": this.userId,
    };
  }
}

/**
 * Google auth provider (placeholder).
 * Will use chrome.identity to get Google ID token.
 *
 * TODO: Implement when adding Google sign-in.
 */
// class GoogleAuthProvider implements AuthProvider {
//   async getAuthHeaders(): Promise<Record<string, string>> {
//     // Use chrome.identity.getAuthToken() to get Google token
//     // Then return Authorization: Bearer <token>
//     const token = await chrome.identity.getAuthToken({ interactive: true });
//     return {
//       "Authorization": `Bearer ${token.token}`,
//     };
//   }
// }

// Current auth provider (swap this when implementing Google auth)
const authProvider: AuthProvider = new DevAuthProvider();

// =============================================================================
// API Client
// =============================================================================

/**
 * Upload encrypted data to cloud.
 *
 * @param request - Upload request with encrypted payload
 * @returns Promise resolving to upload response
 * @throws Error if upload fails
 */
export async function uploadToCloud(
  request: CloudUploadRequest
): Promise<CloudUploadResponse> {
  const authHeaders = await authProvider.getAuthHeaders();

  const response = await fetch(`${CLOUD_API_BASE_URL}/sync/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(request),
  });

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
 * @throws Error if download fails
 */
export async function downloadFromCloud(): Promise<CloudDownloadResponse | null> {
  const authHeaders = await authProvider.getAuthHeaders();

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

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = (errorBody as CloudApiError).error || "Download failed";
    throw new Error(errorMessage);
  }

  return response.json();
}

