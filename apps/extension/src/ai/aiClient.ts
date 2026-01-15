/**
 * TabFlow – AI Client
 *
 * Handles communication with the Azure Functions AI endpoints.
 * All AI calls require authentication and respect quota limits.
 *
 * Features:
 * - Session name suggestion
 * - Tab grouping suggestion
 *
 * Safety:
 * - AI never runs automatically
 * - AI never applies changes without user confirmation
 * - All results are previewed before applying
 */

import { CLOUD_API_BASE_URL } from "@shared/constants";
import { getAuthHeaders } from "../background/auth";

// =============================================================================
// Dev Mode Detection
// =============================================================================

/**
 * Check if we're hitting a local development server.
 */
function isLocalDev(): boolean {
  return CLOUD_API_BASE_URL.includes("localhost");
}

/**
 * Get auth headers for AI API requests.
 * Uses dev bypass for localhost, real Google auth for production.
 */
async function getApiHeaders(): Promise<Record<string, string>> {
  if (isLocalDev()) {
    console.log("[AI] Using dev mode auth (localhost)");
    return {
      "X-DEV-USER-ID": "local-dev-user",
    };
  }

  // Production: use real Google auth
  const authResult = await getAuthHeaders(true);
  if (!authResult.success) {
    throw new AIAuthError(authResult.error);
  }
  return {
    Authorization: authResult.headers.Authorization,
  };
}

// =============================================================================
// Types
// =============================================================================

export interface AITabInput {
  title: string;
  domain: string;
}

export interface AISessionNameResult {
  suggestedName: string;
  remaining: number;
}

export interface AIGroupResult {
  name: string;
  tabIndexes: number[];
}

export interface AIGroupTabsResult {
  groups: AIGroupResult[];
  remaining: number;
}

export interface AIError {
  error: string;
  code: string;
  remaining?: number;
}

// =============================================================================
// Error Handling
// =============================================================================

export class AIQuotaExceededError extends Error {
  constructor() {
    super("AI suggestion limit reached. Resets weekly.");
    this.name = "AIQuotaExceededError";
  }
}

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIServiceError";
  }
}

export class AIAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIAuthError";
  }
}

// =============================================================================
// API Client Functions
// =============================================================================

/**
 * Request an AI-suggested session name based on tab titles and domains.
 *
 * @param tabs - Array of tab info (title + domain only, no URLs for privacy)
 * @returns Suggested name and remaining quota
 * @throws AIQuotaExceededError if quota is exceeded
 * @throws AIServiceError for other errors
 */
export async function suggestSessionName(tabs: AITabInput[]): Promise<AISessionNameResult> {
  const authHeaders = await getApiHeaders();

  const response = await fetch(`${CLOUD_API_BASE_URL}/ai/session-name`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ tabs }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as AIError;
    if (error.code === "AI_QUOTA_EXCEEDED") {
      throw new AIQuotaExceededError();
    }
    throw new AIServiceError(error.error || "Failed to generate suggestion");
  }

  return data as AISessionNameResult;
}

/**
 * Request AI-suggested tab groupings based on tab titles and domains.
 *
 * @param tabs - Array of tab info (title + domain only, no URLs for privacy)
 * @returns Suggested groups and remaining quota
 * @throws AIQuotaExceededError if quota is exceeded
 * @throws AIServiceError for other errors
 */
export async function suggestTabGroups(tabs: AITabInput[]): Promise<AIGroupTabsResult> {
  const authHeaders = await getApiHeaders();

  const response = await fetch(`${CLOUD_API_BASE_URL}/ai/group-tabs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ tabs }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as AIError;
    if (error.code === "AI_QUOTA_EXCEEDED") {
      throw new AIQuotaExceededError();
    }
    throw new AIServiceError(error.error || "Failed to generate grouping");
  }

  return data as AIGroupTabsResult;
}
