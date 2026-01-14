/**
 * TabFlow – Authentication Utility
 *
 * Centralized auth handling using chrome.identity for Google Sign-In.
 * Provides auth headers for cloud sync API calls.
 *
 * Security:
 * - Never log or persist tokens
 * - Handle errors gracefully with user-friendly messages
 * - Centralize all auth logic in one place
 */

// =============================================================================
// Types
// =============================================================================

export interface AuthHeaders {
  Authorization: string;
}

export interface AuthResult {
  success: true;
  headers: AuthHeaders;
}

export interface AuthError {
  success: false;
  error: string;
  code: "USER_CANCELLED" | "NOT_SIGNED_IN" | "TOKEN_ERROR" | "UNKNOWN";
}

export type GetAuthHeadersResult = AuthResult | AuthError;

// =============================================================================
// Auth Functions
// =============================================================================

/**
 * Get authentication headers for API calls.
 * Uses chrome.identity to fetch a Google ID token.
 *
 * @param interactive - If true, show sign-in prompt if needed
 * @returns Promise resolving to auth headers or error
 */
export async function getAuthHeaders(interactive: boolean = true): Promise<GetAuthHeadersResult> {
  try {
    console.log("[Auth] Requesting auth token...");

    // Request token from Chrome identity API
    const tokenResult = await chrome.identity.getAuthToken({
      interactive,
    });

    if (!tokenResult.token) {
      console.log("[Auth] No token returned");
      return {
        success: false,
        error: "Sign-in required to use Cloud Sync",
        code: "NOT_SIGNED_IN",
      };
    }

    // Note: Do NOT log the actual token
    console.log("[Auth] Token obtained successfully");

    return {
      success: true,
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Auth] Token fetch failed:", message);

    // Handle specific Chrome identity errors
    if (message.includes("canceled") || message.includes("cancelled")) {
      return {
        success: false,
        error: "Sign-in was cancelled",
        code: "USER_CANCELLED",
      };
    }

    if (message.includes("not signed in") || message.includes("OAuth2")) {
      return {
        success: false,
        error: "Please sign in to your Google account",
        code: "NOT_SIGNED_IN",
      };
    }

    return {
      success: false,
      error: "Authentication failed. Please try again.",
      code: "TOKEN_ERROR",
    };
  }
}

/**
 * Clear cached auth token.
 * Useful for re-authentication or logout.
 *
 * @param token - Optional specific token to revoke
 */
export async function clearAuthToken(token?: string): Promise<void> {
  try {
    if (token) {
      await chrome.identity.removeCachedAuthToken({ token });
    } else {
      // Get current token and remove it
      const result = await chrome.identity.getAuthToken({ interactive: false });
      if (result.token) {
        await chrome.identity.removeCachedAuthToken({ token: result.token });
      }
    }
    console.log("[Auth] Cached token cleared");
  } catch (error) {
    console.error("[Auth] Failed to clear token:", error);
  }
}

/**
 * Check if user is currently signed in (without prompting).
 *
 * @returns Promise resolving to true if signed in
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: false });
    return !!result.token;
  } catch {
    return false;
  }
}
