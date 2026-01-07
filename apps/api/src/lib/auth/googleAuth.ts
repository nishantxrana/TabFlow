/**
 * TabFlow API – Google Authentication Utilities
 *
 * Verifies Google ID tokens server-side using Google's official library.
 * Extracts user identity for internal use.
 *
 * Security:
 * - Never trust client tokens without verification
 * - Never log ID tokens
 * - Validate issuer, audience, and expiry
 */

import { OAuth2Client, TokenPayload } from "google-auth-library";
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
 * Verify a Google ID token and extract user identity.
 *
 * Validation steps:
 * 1. Token signature verification (via Google's library)
 * 2. Token expiry check
 * 3. Issuer validation (accounts.google.com or https://accounts.google.com)
 * 4. Audience validation (must match our client ID)
 *
 * @param idToken - The Google ID token from the client
 * @returns Verification result with user info or error
 */
export async function verifyGoogleToken(
  idToken: string
): Promise<VerifyGoogleTokenResult> {
  const clientId = getGoogleClientId();
  const client = new OAuth2Client(clientId);

  try {
    // Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return {
        success: false,
        error: "Token payload is empty",
        code: "INVALID_TOKEN",
      };
    }

    // Validate required fields
    const validationError = validateTokenPayload(payload, clientId);
    if (validationError) {
      return validationError;
    }

    // Extract user identity
    const sub = payload.sub;
    const email = payload.email || null;

    // Generate stable internal userId
    const userId = generateUserId(sub);

    return {
      success: true,
      userId,
      email,
      sub,
      authProvider: "google",
    };
  } catch (error) {
    // Handle specific Google auth errors
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Token used too late") || message.includes("expired")) {
      return {
        success: false,
        error: "Token has expired",
        code: "EXPIRED_TOKEN",
      };
    }

    if (message.includes("audience") || message.includes("aud")) {
      return {
        success: false,
        error: "Token was not issued for this application",
        code: "INVALID_AUDIENCE",
      };
    }

    // Generic verification failure (don't expose internal details)
    console.error("[Auth] Google token verification failed:", message);
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
 * Validate the token payload has all required fields.
 */
function validateTokenPayload(
  payload: TokenPayload,
  expectedAudience: string
): GoogleVerificationError | null {
  // Check issuer
  const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
  if (!payload.iss || !validIssuers.includes(payload.iss)) {
    return {
      success: false,
      error: "Invalid token issuer",
      code: "INVALID_TOKEN",
    };
  }

  // Check audience
  if (payload.aud !== expectedAudience) {
    return {
      success: false,
      error: "Token audience mismatch",
      code: "INVALID_AUDIENCE",
    };
  }

  // Check expiry (Google library does this, but double-check)
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return {
      success: false,
      error: "Token has expired",
      code: "EXPIRED_TOKEN",
    };
  }

  // Check subject (user ID)
  if (!payload.sub) {
    return {
      success: false,
      error: "Token missing subject",
      code: "INVALID_TOKEN",
    };
  }

  return null;
}

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

