/**
 * TabFlow API – CORS Helper
 *
 * Handles CORS for Chrome extension requests.
 *
 * Security:
 * - Production: Only allows the published TabFlow extension origin
 * - Development: Can add additional origins via CORS_ALLOWED_ORIGINS env var
 * - No wildcards
 * - No credentials
 *
 * Environment Variables:
 * - CORS_ALLOWED_ORIGINS: Comma-separated list of additional origins (optional)
 *   Example: "chrome-extension://dev123,http://localhost:3000"
 */

import { HttpResponseInit } from "@azure/functions";

// =============================================================================
// Constants
// =============================================================================

/**
 * Production Chrome extension origin (always allowed).
 * This is hardcoded for security - cannot be disabled.
 */
const PRODUCTION_EXTENSION_ORIGIN =
  "chrome-extension://oniialkgdccpmecdkgpdheloohpcikmf";

/**
 * Get all allowed origins.
 * - Always includes production extension origin
 * - Optionally includes additional origins from CORS_ALLOWED_ORIGINS env var
 */
function getAllowedOrigins(): string[] {
  const origins = [PRODUCTION_EXTENSION_ORIGIN];

  // Add additional origins from environment (for dev/testing)
  const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (additionalOrigins) {
    const extras = additionalOrigins
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    origins.push(...extras);
  }

  return origins;
}

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
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
}

/**
 * Get CORS headers for an allowed origin.
 * Returns null if origin is not allowed.
 */
export function getCorsHeaders(origin: string | null): CorsHeaders | null {
  if (!origin || !isOriginAllowed(origin)) {
    return null;
  }

  // Echo back the requesting origin (must be in allowed list)
  const headers: CorsHeaders = {
    "Access-Control-Allow-Origin": origin,
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
