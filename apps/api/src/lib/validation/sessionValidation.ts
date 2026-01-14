/**
 * TabFlow API – Session Validation
 *
 * Defensive validation for session data.
 * Used when/if the server ever needs to validate decrypted session data.
 */

import { MAX_SESSION_NAME_LENGTH, MIN_SESSION_NAME_LENGTH } from "./constants";

// =============================================================================
// Types
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

// =============================================================================
// Session Name Validation
// =============================================================================

/**
 * Validate a session name.
 *
 * Rules:
 * - Must be a non-empty string
 * - Must be between MIN and MAX length
 * - Leading/trailing whitespace is trimmed before validation
 *
 * @param name - The session name to validate
 * @returns Validation result with error details if invalid
 */
export function validateSessionName(name: unknown): ValidationResult {
  // Type check
  if (typeof name !== "string") {
    return {
      valid: false,
      error: "Session name must be a string",
      code: "INVALID_SESSION_NAME",
    };
  }

  // Trim and check length
  const trimmed = name.trim();

  if (trimmed.length < MIN_SESSION_NAME_LENGTH) {
    return {
      valid: false,
      error: "Session name cannot be empty",
      code: "INVALID_SESSION_NAME",
    };
  }

  if (trimmed.length > MAX_SESSION_NAME_LENGTH) {
    return {
      valid: false,
      error: `Session name must be ${MAX_SESSION_NAME_LENGTH} characters or less`,
      code: "INVALID_SESSION_NAME",
    };
  }

  return { valid: true };
}
