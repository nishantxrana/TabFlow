/**
 * TabFlow API – Sync Download Function
 *
 * HTTP-triggered Azure Function that retrieves encrypted user sync data.
 *
 * Endpoint: GET /sync/download
 *
 * Security:
 * - Requires valid Google ID token
 * - userId derived server-side (never trust client)
 * - Payload returned exactly as stored (opaque)
 * - Never logs tokens or payloads
 *
 * Request:
 * - Header: Authorization: Bearer <id_token>
 *
 * Response (200 - data exists):
 * { "payload": "<base64>", "schemaVersion": 1, "lastSyncedAt": "..." }
 *
 * Response (204 - no data):
 * No body
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { verifyGoogleToken } from "../lib/auth";
import { downloadSyncBlob } from "../lib/storage";

// =============================================================================
// Constants
// =============================================================================

/** Dev mode flag - ONLY for local testing, blocked in Azure Production */
const IS_LOCAL = process.env.AZURE_FUNCTIONS_ENVIRONMENT !== "Production";
const DEV_MODE_ENABLED = IS_LOCAL && process.env.DEV_MODE_ENABLED === "true";

// =============================================================================
// Types
// =============================================================================

interface SyncDownloadSuccessResponse {
  payload: string;
  schemaVersion: number;
  lastSyncedAt: string;
}

interface SyncDownloadErrorResponse {
  error: string;
  code: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract ID token from Authorization header.
 */
function extractIdToken(request: HttpRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }

  return null;
}

/**
 * Create a JSON response.
 */
function jsonResponse(
  body: SyncDownloadSuccessResponse | SyncDownloadErrorResponse,
  status: number
): HttpResponseInit {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

// =============================================================================
// Function Handler
// =============================================================================

async function syncDownload(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("[syncDownload] Processing download request");

  // Only accept GET requests
  if (request.method !== "GET") {
    return jsonResponse(
      { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
      405
    );
  }

  // -------------------------------------------------------------------------
  // Step 1: Authenticate
  // -------------------------------------------------------------------------

  let userId: string;

  // DEV MODE: Allow bypassing auth with X-DEV-USER-ID header (LOCAL ONLY)
  const devUserId = request.headers.get("x-dev-user-id");
  if (DEV_MODE_ENABLED && devUserId) {
    context.log("⚠️  [syncDownload] DEV MODE: Using mock user ID from header");
    context.log("⚠️  [syncDownload] THIS MUST BE DISABLED IN PRODUCTION");
    userId = `dev-${devUserId}`;
  } else {
    // Production auth flow
    const idToken = extractIdToken(request);
    if (!idToken) {
      context.log("[syncDownload] No authorization token provided");
      return jsonResponse(
        { error: "Authorization required", code: "UNAUTHORIZED" },
        401
      );
    }

    // Verify token and get userId (NEVER log the token)
    context.log("[syncDownload] Verifying authentication...");
    const authResult = await verifyGoogleToken(idToken);

    if (!authResult.success) {
      context.log(`[syncDownload] Auth failed: ${authResult.code}`);
      return jsonResponse(
        { error: authResult.error, code: authResult.code },
        401
      );
    }

    userId = authResult.userId;
  }

  context.log(`[syncDownload] Authenticated user: ${userId.substring(0, 8)}...`);

  // -------------------------------------------------------------------------
  // Step 2: Download from Blob Storage
  // -------------------------------------------------------------------------

  context.log("[syncDownload] Fetching sync data...");

  const downloadResult = await downloadSyncBlob(userId);

  // Handle errors
  if (!downloadResult.success) {
    context.log(`[syncDownload] Download failed: ${downloadResult.code}`);
    return jsonResponse(
      { error: downloadResult.error, code: downloadResult.code },
      500
    );
  }

  // Handle no data (204 No Content)
  if (!downloadResult.found) {
    context.log("[syncDownload] No sync data found for user");
    return {
      status: 204,
      headers: {},
    };
  }

  // -------------------------------------------------------------------------
  // Step 3: Return Success
  // -------------------------------------------------------------------------

  context.log(`[syncDownload] Returning sync data (last synced: ${downloadResult.lastSyncedAt})`);

  // DO NOT log payload contents
  return jsonResponse(
    {
      payload: downloadResult.payload,
      schemaVersion: downloadResult.schemaVersion,
      lastSyncedAt: downloadResult.lastSyncedAt,
    },
    200
  );
}

// =============================================================================
// Function Registration
// =============================================================================

app.http("syncDownload", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "sync/download",
  handler: syncDownload,
});

