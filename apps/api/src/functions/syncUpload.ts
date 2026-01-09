/**
 * TabFlow API – Sync Upload Function
 *
 * HTTP-triggered Azure Function that stores encrypted user sync data.
 *
 * Endpoint: POST /sync/upload
 *
 * Security:
 * - Requires valid Google ID token
 * - userId derived server-side (never trust client)
 * - Payload is client-encrypted (server treats as opaque)
 * - Never logs tokens or payloads
 *
 * Request:
 * - Header: Authorization: Bearer <id_token>
 * - Body: { "payload": "<base64>", "schemaVersion": 1, "clientTimestamp": 123 }
 *
 * Response (200):
 * { "status": "ok", "syncedAt": "2024-01-01T00:00:00.000Z" }
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { verifyGoogleToken } from "../lib/auth";
import { uploadSyncBlob } from "../lib/storage";

// =============================================================================
// Constants
// =============================================================================

/** Maximum payload size in bytes (5 MB) */
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024;

/** Supported schema versions */
const SUPPORTED_SCHEMA_VERSIONS = [1];

/** Dev mode flag - ONLY for local testing, blocked in Azure Production */
const IS_LOCAL = process.env.AZURE_FUNCTIONS_ENVIRONMENT !== "Production";
const DEV_MODE_ENABLED = IS_LOCAL && process.env.DEV_MODE_ENABLED === "true";

// =============================================================================
// Types
// =============================================================================

interface SyncUploadRequestBody {
  payload?: string;
  schemaVersion?: number;
  clientTimestamp?: number;
}

interface SyncUploadSuccessResponse {
  status: "ok";
  syncedAt: string;
}

interface SyncUploadErrorResponse {
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
  body: SyncUploadSuccessResponse | SyncUploadErrorResponse,
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

/**
 * Validate request body.
 * Returns error message if invalid, null if valid.
 */
function validateRequestBody(
  body: SyncUploadRequestBody
): { error: string; code: string } | null {
  // Check payload exists
  if (!body.payload || typeof body.payload !== "string") {
    return { error: "Missing or invalid payload", code: "INVALID_PAYLOAD" };
  }

  // Check payload size (base64 string length)
  if (body.payload.length > MAX_PAYLOAD_SIZE) {
    return { error: "Payload too large", code: "PAYLOAD_TOO_LARGE" };
  }

  // Check payload is valid base64 (basic check)
  if (!/^[A-Za-z0-9+/=]+$/.test(body.payload)) {
    return { error: "Payload must be base64 encoded", code: "INVALID_PAYLOAD" };
  }

  // Check schema version
  if (
    body.schemaVersion === undefined ||
    typeof body.schemaVersion !== "number"
  ) {
    return {
      error: "Missing or invalid schemaVersion",
      code: "INVALID_SCHEMA",
    };
  }

  if (!SUPPORTED_SCHEMA_VERSIONS.includes(body.schemaVersion)) {
    return {
      error: `Unsupported schema version. Supported: ${SUPPORTED_SCHEMA_VERSIONS.join(
        ", "
      )}`,
      code: "UNSUPPORTED_SCHEMA",
    };
  }

  // Check client timestamp
  if (
    body.clientTimestamp === undefined ||
    typeof body.clientTimestamp !== "number"
  ) {
    return {
      error: "Missing or invalid clientTimestamp",
      code: "INVALID_TIMESTAMP",
    };
  }

  // Sanity check timestamp (not too far in past or future)
  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  if (
    body.clientTimestamp < now - oneYearMs ||
    body.clientTimestamp > now + oneYearMs
  ) {
    return {
      error: "Client timestamp out of acceptable range",
      code: "INVALID_TIMESTAMP",
    };
  }

  return null;
}

// =============================================================================
// Function Handler
// =============================================================================

async function syncUpload(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("[syncUpload] Processing upload request");

  // Only accept POST requests
  if (request.method !== "POST") {
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
    context.log("⚠️  [syncUpload] DEV MODE: Using mock user ID from header");
    context.log("⚠️  [syncUpload] THIS MUST BE DISABLED IN PRODUCTION");
    userId = `dev-${devUserId}`;
  } else {
    // Production auth flow
    const idToken = extractIdToken(request);
    if (!idToken) {
      context.log("[syncUpload] No authorization token provided");
      return jsonResponse(
        { error: "Authorization required", code: "UNAUTHORIZED" },
        401
      );
    }

    // Verify token and get userId (NEVER log the token)
    context.log("[syncUpload] Verifying authentication...");
    const authResult = await verifyGoogleToken(idToken);

    if (!authResult.success) {
      context.log(`[syncUpload] Auth failed: ${authResult.code}`);
      return jsonResponse(
        { error: authResult.error, code: authResult.code },
        401
      );
    }

    userId = authResult.userId;
  }

  context.log(`[syncUpload] Authenticated user: ${userId.substring(0, 8)}...`);

  // -------------------------------------------------------------------------
  // Step 2: Parse and Validate Request Body
  // -------------------------------------------------------------------------

  let body: SyncUploadRequestBody;
  try {
    body = (await request.json()) as SyncUploadRequestBody;
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body", code: "INVALID_JSON" },
      400
    );
  }

  const validationError = validateRequestBody(body);
  if (validationError) {
    context.log(`[syncUpload] Validation failed: ${validationError.code}`);
    return jsonResponse(validationError, 400);
  }

  // -------------------------------------------------------------------------
  // Step 3: Upload to Blob Storage
  // -------------------------------------------------------------------------

  // DO NOT log payload contents
  context.log(
    `[syncUpload] Uploading sync data (schema v${body.schemaVersion})`
  );

  const uploadResult = await uploadSyncBlob(
    userId,
    body.payload!,
    body.schemaVersion!,
    body.clientTimestamp!
  );

  if (!uploadResult.success) {
    context.log(`[syncUpload] Upload failed: ${uploadResult.code}`);
    return jsonResponse(
      { error: uploadResult.error, code: uploadResult.code },
      500
    );
  }

  // -------------------------------------------------------------------------
  // Step 4: Return Success
  // -------------------------------------------------------------------------

  context.log(`[syncUpload] Upload successful at ${uploadResult.syncedAt}`);

  return jsonResponse(
    {
      status: "ok",
      syncedAt: uploadResult.syncedAt,
    },
    200
  );
}

// =============================================================================
// Function Registration
// =============================================================================

app.http("syncUpload", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sync/upload",
  handler: syncUpload,
});
