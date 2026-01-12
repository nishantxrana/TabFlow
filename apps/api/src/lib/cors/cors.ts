/**
 * TabFlow API – CORS Helper
 *
 * Handles CORS for Chrome extension requests.
 *
 * Security:
 * - Only allows the TabFlow extension origin
 * - No wildcards
 * - No credentials
 */

import { HttpResponseInit } from "@azure/functions";

// =============================================================================
// Constants
// =============================================================================

/**
 * Allowed Chrome extension origin.
 * This is the only origin that can make cross-origin requests.
 */
const ALLOWED_ORIGIN = "chrome-extension://oniialkgdccpmecdkgpdheloohpcikmf";

/**
 * Allowed HTTP methods for CORS.
 */
const ALLOWED_METHODS = "GET, POST, OPTIONS";

/**
 * Allowed HTTP headers for CORS.
 */
const ALLOWED_HEADERS = "Content-Type, Authorization, X-DEV-USER-ID";

/**
 * CORS preflight cache duration in seconds (24 hours).
 */
const MAX_AGE = "86400";

// =============================================================================
// Types
// =============================================================================

export type CorsHeaders = Record<string, string>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if the given origin is allowed.
 */
export function isOriginAllowed(origin: string | null): boolean {
  return origin === ALLOWED_ORIGIN;
}

/**
 * Get CORS headers for an allowed origin.
 * Returns null if origin is not allowed.
 */
export function getCorsHeaders(origin: string | null): CorsHeaders | null {
  if (!isOriginAllowed(origin)) {
    return null;
  }

  const headers: CorsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": MAX_AGE,
  };

  return headers;
}

/**
 * Create a preflight (OPTIONS) response.
 * Returns 204 No Content with CORS headers.
 */
export function createPreflightResponse(
  origin: string | null
): HttpResponseInit {
  const corsHeaders = getCorsHeaders(origin);

  if (!corsHeaders) {
    // Origin not allowed - return 403
    return {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Origin not allowed", code: "CORS_ERROR" }),
    };
  }

  return {
    status: 204,
    headers: corsHeaders,
  };
}

/**
 * Add CORS headers to an existing response.
 * Returns a new response with CORS headers merged.
 */
export function withCorsHeaders(
  response: HttpResponseInit,
  origin: string | null
): HttpResponseInit {
  const corsHeaders = getCorsHeaders(origin);

  if (corsHeaders) {
    return {
      ...response,
      headers: {
        ...(response.headers as Record<string, string>),
        ...corsHeaders,
      },
    };
  }

  return response;
}
