/**
 * TabFlow API – AI Feature Constants
 *
 * Hard limits for AI features.
 * These values are NON-NEGOTIABLE.
 */

// =============================================================================
// Session Name Limits
// =============================================================================

/** Maximum session name length (hard limit) */
export const MAX_SESSION_NAME_LENGTH = 50;

/** Maximum tabs to consider for naming */
export const MAX_TABS_FOR_NAMING = 100;

// =============================================================================
// Tab Grouping Limits
// =============================================================================

/** Maximum tabs for AI grouping */
export const MAX_TABS_FOR_GROUPING = 50;

// =============================================================================
// Quota Limits
// =============================================================================

/** Maximum AI requests per user per 7-day window */
export const AI_REQUEST_LIMIT = 100;

/** Quota window duration in days */
export const QUOTA_WINDOW_DAYS = 7;

// =============================================================================
// AI Features
// =============================================================================

/** AI feature identifiers for quota tracking */
export const AI_FEATURE = {
  SESSION_NAME: "session_name",
  TAB_GROUPING: "tab_grouping",
} as const;

export type AIFeature = (typeof AI_FEATURE)[keyof typeof AI_FEATURE];

// =============================================================================
// Error Codes
// =============================================================================

export const AI_ERROR_CODE = {
  QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED",
  INVALID_INPUT: "AI_INVALID_INPUT",
  INVALID_SESSION_NAME: "INVALID_AI_SESSION_NAME",
  INVALID_GROUPING: "INVALID_AI_GROUPING",
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  TABS_REQUIRED: "TABS_REQUIRED",
  TABS_LIMIT_EXCEEDED: "TABS_LIMIT_EXCEEDED",
} as const;
