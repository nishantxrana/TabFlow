/**
 * TabFlow API – Google Authentication Utilities
 *
 * Verifies Google OAuth access tokens server-side by calling Google's tokeninfo endpoint.
 * This is used for Chrome extensions which use chrome.identity.getAuthToken().
 *
 * Security:
 * - Never trust client tokens without verification
 * - Never log tokens
 * - Validate audience matches our client ID
 */

import { createHash } from "crypto";

// =============================================================================
// Types
// =============================================================================

export interface GoogleVerificationResult {
  success: true;
  userId: string;
  email: string | null;
  sub: string;
  authProvider: "google";
}

export interface GoogleVerificationError {
  success: false;
  error: string;
  code: "INVALID_TOKEN" | "EXPIRED_TOKEN" | "INVALID_AUDIENCE" | "VERIFICATION_FAILED";
}

export type VerifyGoogleTokenResult = GoogleVerificationResult | GoogleVerificationError;

/**
 * Response from Google's tokeninfo endpoint
 */
interface GoogleTokenInfo {
  azp?: string; // Authorized party (client ID that requested the token)
  aud?: string; // Audience (client ID the token was issued to)
  sub?: string; // Subject (unique user ID)
  scope?: string; // Scopes granted
  exp?: string; // Expiry timestamp
  expires_in?: string; // Seconds until expiry
  email?: string; // User's email (if email scope granted)
  email_verified?: string;
  access_type?: string;
  error_description?: string;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Get Google Client ID from environment.
 * Throws if not configured.
 */
function getGoogleClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
  }
  return clientId;
}

// =============================================================================
// Token Verification
// =============================================================================

/**
 * Verify a Google OAuth access token and extract user identity.
 *
 * For Chrome extensions using chrome.identity.getAuthToken(), we receive
 * an access token (not an ID token). We verify it by calling Google's
 * tokeninfo endpoint.
 *
 * Validation steps:
 * 1. Call Google's tokeninfo endpoint with the access token
 * 2. Verify the token is valid and not expired
 * 3. Verify the audience matches our client ID
 * 4. Extract user identity (sub, email)
 *
 * @param accessToken - The Google OAuth access token from the client
 * @returns Verification result with user info or error
 */
export async function verifyGoogleToken(accessToken: string): Promise<VerifyGoogleTokenResult> {
  const expectedClientId = getGoogleClientId();

  try {
    // Call Google's tokeninfo endpoint to verify the access token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );

    const tokenInfo: GoogleTokenInfo = await response.json();

    // Check for error response
    if (!response.ok || tokenInfo.error_description) {
      const isExpired = tokenInfo.error_description?.includes("expired");

      if (isExpired) {
        return {
          success: false,
          error: "Token has expired",
          code: "EXPIRED_TOKEN",
        };
      }

      return {
        success: false,
        error: "Invalid token",
        code: "INVALID_TOKEN",
      };
    }

    // Verify audience matches our client ID
    // For Chrome extension tokens, check both 'aud' and 'azp' (authorized party)
    const tokenAudience = tokenInfo.aud || tokenInfo.azp;
    if (tokenAudience !== expectedClientId) {
      return {
        success: false,
        error: "Token was not issued for this application",
        code: "INVALID_AUDIENCE",
      };
    }

    // Verify we have a subject (user ID)
    if (!tokenInfo.sub) {
      return {
        success: false,
        error: "Token missing user identifier",
        code: "INVALID_TOKEN",
      };
    }

    // Generate stable internal userId
    const userId = generateUserId(tokenInfo.sub);

    return {
      success: true,
      userId,
      email: tokenInfo.email || null,
      sub: tokenInfo.sub,
      authProvider: "google",
    };
  } catch (error) {
    // Only log error type, not message (could contain sensitive data)
    const errorType = error instanceof Error ? error.name : "Unknown";
    console.error(`[Auth] VERIFICATION_ERROR: type=${errorType}`);

    return {
      success: false,
      error: "Token verification failed",
      code: "VERIFICATION_FAILED",
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate a stable internal userId from Google's subject (sub).
 *
 * Format: SHA-256 hash of "google:{sub}"
 * This ensures:
 * - Stable across sessions
 * - Not directly exposing Google's internal ID
 * - Predictable length
 */
function generateUserId(sub: string): string {
  const input = `google:${sub}`;
  return createHash("sha256").update(input).digest("hex");
}
