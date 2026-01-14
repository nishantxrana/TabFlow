/**
 * TabFlow – Runtime Schema Validation
 * Validates data at runtime (e.g., for import).
 */

import type { BackupBlob, Session, TabSnapshot, Group } from "./types";

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if value is a non-null object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Check if value is a string.
 */
function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if value is a number.
 */
function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Check if value is an array.
 */
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// =============================================================================
// Schema Validators
// =============================================================================

/**
 * Validate a TabSnapshot object.
 */
export function validateTabSnapshot(data: unknown): data is TabSnapshot {
  if (!isObject(data)) return false;

  return (
    isString(data.title) &&
    isString(data.url) &&
    isString(data.domain) &&
    isString(data.favicon) &&
    isNumber(data.lastAccessed)
  );
}

/**
 * Validate a Group object.
 */
export function validateGroup(data: unknown): data is Group {
  if (!isObject(data)) return false;

  if (!isString(data.id) || !isString(data.name)) return false;
  if (!isArray(data.tabs)) return false;

  return data.tabs.every(validateTabSnapshot);
}

/**
 * Validate a Session object.
 */
export function validateSession(data: unknown): data is Session {
  if (!isObject(data)) return false;

  if (!isString(data.id) || !isString(data.name)) return false;
  if (!isNumber(data.createdAt)) return false;
  if (!isArray(data.groups)) return false;

  return data.groups.every(validateGroup);
}

/**
 * Validate import data schema (BackupBlob).
 */
export function validateImportSchema(data: unknown): data is BackupBlob {
  if (!isObject(data)) return false;

  // Check required fields
  if (!isNumber(data.version)) return false;
  if (!isString(data.timestamp)) return false;
  if (!isArray(data.sessions)) return false;

  // Validate each session
  return data.sessions.every(validateSession);
}

// =============================================================================
// Export Validation Result
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate import data with detailed error messages.
 */
export function validateImportWithErrors(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isObject(data)) {
    errors.push("Import data must be a JSON object");
    return { valid: false, errors };
  }

  if (!isNumber(data.version)) {
    errors.push("Missing or invalid 'version' field");
  }

  if (!isString(data.timestamp)) {
    errors.push("Missing or invalid 'timestamp' field");
  }

  if (!isArray(data.sessions)) {
    errors.push("Missing or invalid 'sessions' array");
    return { valid: false, errors };
  }

  // Validate each session
  (data.sessions as unknown[]).forEach((session, index) => {
    if (!validateSession(session)) {
      errors.push(`Invalid session at index ${index}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
