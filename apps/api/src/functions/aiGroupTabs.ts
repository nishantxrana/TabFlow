/**
 * TabFlow API – AI Tab Grouping Function
 *
 * HTTP-triggered Azure Function that generates tab grouping suggestions.
 *
 * Endpoint: POST /ai/group-tabs
 *
 * Security:
 * - Requires valid Google ID token
 * - Enforces quota (100 requests per 7 days)
 * - Validates input and output strictly
 * - Never stores prompts or AI output
 *
 * Request:
 * - Header: Authorization: Bearer <id_token>
 * - Body: { "tabs": [{ "title": string, "domain": string }] }
 *
 * Response (200):
 * { "groups": [{ "name": string, "tabIndexes": number[] }], "remaining": number }
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { verifyGoogleToken } from "../lib/auth";
import { createPreflightResponse, withCorsHeaders } from "../lib/cors";
import { checkAndIncrementQuota } from "../lib/quota";
import {
  AI_FEATURE,
  AI_ERROR_CODE,
  validateTabsForGrouping,
  validateAIGrouping,
  generateTabGroups,
} from "../lib/ai";
import type { AIGroupTabsRequest, AIGroupTabsResponse, AIGroupResult } from "../lib/ai";

// =============================================================================
// Constants
// =============================================================================

/** Dev mode flag - ONLY for local testing, blocked in Azure Production */
const IS_LOCAL = process.env.AZURE_FUNCTIONS_ENVIRONMENT !== "Production";
const DEV_MODE_ENABLED = IS_LOCAL && process.env.DEV_MODE_ENABLED === "true";

// =============================================================================
// Types
// =============================================================================

interface ErrorResponse {
  error: string;
  code: string;
  remaining?: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract ID token from Authorization header.
 */
function extractIdToken(request: HttpRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

/**
 * Create a JSON response with CORS headers.
 */
function jsonResponse(
  body: AIGroupTabsResponse | ErrorResponse,
  status: number,
  origin: string | null
): HttpResponseInit {
  return withCorsHeaders(
    {
      status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    origin
  );
}

// =============================================================================
// Function Handler
// =============================================================================

async function aiGroupTabs(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const origin = request.headers.get("origin");

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return createPreflightResponse(origin);
  }

  try {
    // Only accept POST
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405, origin);
    }

    // -------------------------------------------------------------------------
    // Step 1: Authenticate
    // -------------------------------------------------------------------------

    let userId: string;

    // DEV MODE: Allow bypassing auth with X-DEV-USER-ID header (LOCAL ONLY)
    const devUserId = request.headers.get("x-dev-user-id");
    if (DEV_MODE_ENABLED && devUserId) {
      context.warn("[aiGroupTabs] DEV_MODE: Using mock user ID - MUST BE DISABLED IN PRODUCTION");
      userId = `dev-${devUserId}`;
    } else {
      // Production auth flow
      const idToken = extractIdToken(request);
      if (!idToken) {
        return jsonResponse({ error: "Authorization required", code: "UNAUTHORIZED" }, 401, origin);
      }

      const authResult = await verifyGoogleToken(idToken);
      if (!authResult.success) {
        return jsonResponse({ error: authResult.error, code: authResult.code }, 401, origin);
      }

      userId = authResult.userId;
    }

    context.log(`[aiGroupTabs] User: ${userId.substring(0, 8)}...`);

    // -------------------------------------------------------------------------
    // Step 2: Check and Increment Quota (BEFORE AI call)
    // -------------------------------------------------------------------------

    const quotaResult = await checkAndIncrementQuota(userId, AI_FEATURE.TAB_GROUPING);
    if (!quotaResult.allowed) {
      context.log(`[aiGroupTabs] Quota exceeded for user ${userId.substring(0, 8)}`);
      return jsonResponse(
        {
          error: "AI suggestion limit reached. Resets weekly.",
          code: AI_ERROR_CODE.QUOTA_EXCEEDED,
          remaining: 0,
        },
        429,
        origin
      );
    }

    // -------------------------------------------------------------------------
    // Step 3: Parse and Validate Input
    // -------------------------------------------------------------------------

    let body: AIGroupTabsRequest;
    try {
      body = (await request.json()) as AIGroupTabsRequest;
    } catch {
      return jsonResponse(
        { error: "Invalid JSON body", code: "INVALID_JSON", remaining: quotaResult.remaining },
        400,
        origin
      );
    }

    const inputError = validateTabsForGrouping(body.tabs);
    if (inputError) {
      return jsonResponse({ ...inputError, remaining: quotaResult.remaining }, 400, origin);
    }

    // -------------------------------------------------------------------------
    // Step 4: Call AI Service
    // -------------------------------------------------------------------------

    let groups: AIGroupResult[];
    try {
      groups = await generateTabGroups(body.tabs);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      context.error(`[aiGroupTabs] AI service error: ${errorMsg}`);
      return jsonResponse(
        {
          error: "Could not generate grouping. Please try later.",
          code: AI_ERROR_CODE.AI_SERVICE_ERROR,
          remaining: quotaResult.remaining,
        },
        500,
        origin
      );
    }

    // -------------------------------------------------------------------------
    // Step 5: Validate AI Output
    // -------------------------------------------------------------------------

    const outputError = validateAIGrouping(groups, body.tabs.length);
    if (outputError) {
      context.warn(`[aiGroupTabs] Invalid AI output: ${outputError.error}`);
      return jsonResponse(
        {
          error: "Could not generate valid grouping. Please try later.",
          code: outputError.code,
          remaining: quotaResult.remaining,
        },
        500,
        origin
      );
    }

    // -------------------------------------------------------------------------
    // Step 6: Return Success
    // -------------------------------------------------------------------------

    context.log(
      `[aiGroupTabs] Success: ${groups.length} groups, remaining=${quotaResult.remaining}`
    );

    return jsonResponse(
      {
        groups,
        remaining: quotaResult.remaining,
      },
      200,
      origin
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown";
    context.error(`[aiGroupTabs] Internal error: ${errorMsg}`);
    return jsonResponse({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500, origin);
  }
}

// =============================================================================
// Function Registration
// =============================================================================

app.http("aiGroupTabs", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "ai/group-tabs",
  handler: aiGroupTabs,
});
