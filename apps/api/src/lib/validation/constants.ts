/**
 * TabFlow API – Validation Constants
 *
 * Shared constants for data validation.
 * These should match frontend constants where applicable.
 */

// =============================================================================
// Session Validation
// =============================================================================

/** Maximum session name length (characters) - must match frontend */
export const MAX_SESSION_NAME_LENGTH = 50;

/** Minimum session name length (characters) */
export const MIN_SESSION_NAME_LENGTH = 1;

// =============================================================================
// Payload Limits
// =============================================================================

/** Maximum sync payload size in bytes (5 MB) */
export const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024;

/** Supported schema versions */
export const SUPPORTED_SCHEMA_VERSIONS = [1];
