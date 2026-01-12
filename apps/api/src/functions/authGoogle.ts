/**
 * TabFlow API – Google Authentication Function
 *
 * HTTP-triggered Azure Function that verifies Google ID tokens
 * and returns a stable internal userId for the authenticated user.
 *
 * Endpoint: POST /auth/google
 *
 * Request:
 * - Header: Authorization: Bearer <id_token>
 * - OR Body: { "idToken": "<id_token>" }
 *
 * Response (200):
 * {
 *   "userId": "sha256hash...",
 *   "authProvider": "google"
 * }
 *
 * Error Response (401/400/500):
 * {
 *   "error": "Error message",
 *   "code": "ERROR_CODE"
 * }
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { verifyGoogleToken } from "../lib/auth";

// =============================================================================
// Types
// =============================================================================

interface AuthRequestBody {
  idToken?: string;
}

interface AuthSuccessResponse {
  userId: string;
  authProvider: "google";
}

interface AuthErrorResponse {
  error: string;
  code: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract ID token from request.
 * Checks Authorization header first, then request body.
 */
async function extractIdToken(request: HttpRequest): Promise<string | null> {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
  }

  // Check request body
  try {
    const body = (await request.json()) as AuthRequestBody;
    if (body.idToken && typeof body.idToken === "string") {
      return body.idToken;
    }
  } catch {
    // Body parsing failed, that's okay
  }

  return null;
}

/**
 * Create a JSON response.
 */
function jsonResponse(
  body: AuthSuccessResponse | AuthErrorResponse,
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

async function authGoogle(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Only accept POST requests
  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
      405
    );
  }

  // Extract ID token from request
  const idToken = await extractIdToken(request);

  if (!idToken) {
    context.log("[authGoogle] AUTH_MISSING: No token provided");
    return jsonResponse(
      {
        error: "ID token required. Provide via Authorization header or request body.",
        code: "MISSING_TOKEN",
      },
      400
    );
  }

  const result = await verifyGoogleToken(idToken);

  if (!result.success) {
    context.log(`[authGoogle] AUTH_FAILED: ${result.code}`);
    const statusCode =
      result.code === "EXPIRED_TOKEN" || result.code === "INVALID_TOKEN"
        ? 401
        : result.code === "INVALID_AUDIENCE"
        ? 403
        : 401;

    return jsonResponse(
      { error: result.error, code: result.code },
      statusCode
    );
  }

  context.log(`[authGoogle] SUCCESS: user=${result.userId.substring(0, 8)}`);

  return jsonResponse(
    {
      userId: result.userId,
      authProvider: result.authProvider,
    },
    200
  );
}

// =============================================================================
// Function Registration
// =============================================================================

app.http("authGoogle", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/google",
  handler: authGoogle,
});

