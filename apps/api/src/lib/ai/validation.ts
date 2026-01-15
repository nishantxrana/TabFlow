/**
 * TabFlow API – AI Input/Output Validation
 *
 * Strict validation for AI requests and responses.
 * Never trust client input. Always validate AI output.
 */

import {
  MAX_TABS_FOR_NAMING,
  MAX_TABS_FOR_GROUPING,
  MAX_SESSION_NAME_LENGTH,
  AI_ERROR_CODE,
} from "./constants";
import type { AITabInput, AIGroupResult } from "./types";

// =============================================================================
// Input Validation
// =============================================================================

export interface ValidationError {
  error: string;
  code: string;
}

/**
 * Validate tabs array for session naming.
 */
export function validateTabsForNaming(tabs: unknown): ValidationError | null {
  if (!Array.isArray(tabs)) {
    return { error: "tabs must be an array", code: AI_ERROR_CODE.TABS_REQUIRED };
  }

  if (tabs.length === 0) {
    return { error: "tabs cannot be empty", code: AI_ERROR_CODE.TABS_REQUIRED };
  }

  if (tabs.length > MAX_TABS_FOR_NAMING) {
    return {
      error: `Maximum ${MAX_TABS_FOR_NAMING} tabs allowed for naming`,
      code: AI_ERROR_CODE.TABS_LIMIT_EXCEEDED,
    };
  }

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    if (!tab || typeof tab !== "object") {
      return { error: `tabs[${i}] must be an object`, code: AI_ERROR_CODE.INVALID_INPUT };
    }

    const { title, domain } = tab as AITabInput;

    if (typeof title !== "string" || title.trim() === "") {
      return {
        error: `tabs[${i}].title must be a non-empty string`,
        code: AI_ERROR_CODE.INVALID_INPUT,
      };
    }

    if (typeof domain !== "string" || domain.trim() === "") {
      return {
        error: `tabs[${i}].domain must be a non-empty string`,
        code: AI_ERROR_CODE.INVALID_INPUT,
      };
    }
  }

  return null;
}

/**
 * Validate tabs array for grouping.
 */
export function validateTabsForGrouping(tabs: unknown): ValidationError | null {
  if (!Array.isArray(tabs)) {
    return { error: "tabs must be an array", code: AI_ERROR_CODE.TABS_REQUIRED };
  }

  if (tabs.length === 0) {
    return { error: "tabs cannot be empty", code: AI_ERROR_CODE.TABS_REQUIRED };
  }

  if (tabs.length > MAX_TABS_FOR_GROUPING) {
    return {
      error: `Maximum ${MAX_TABS_FOR_GROUPING} tabs allowed for grouping`,
      code: AI_ERROR_CODE.TABS_LIMIT_EXCEEDED,
    };
  }

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    if (!tab || typeof tab !== "object") {
      return { error: `tabs[${i}] must be an object`, code: AI_ERROR_CODE.INVALID_INPUT };
    }

    const { title, domain } = tab as AITabInput;

    if (typeof title !== "string" || title.trim() === "") {
      return {
        error: `tabs[${i}].title must be a non-empty string`,
        code: AI_ERROR_CODE.INVALID_INPUT,
      };
    }

    if (typeof domain !== "string" || domain.trim() === "") {
      return {
        error: `tabs[${i}].domain must be a non-empty string`,
        code: AI_ERROR_CODE.INVALID_INPUT,
      };
    }
  }

  return null;
}

// =============================================================================
// Output Validation
// =============================================================================

/**
 * Validate AI-generated session name.
 *
 * Rules:
 * - Non-empty
 * - ≤ 50 characters
 * - No newlines
 * - Plain text only
 */
export function validateAISessionName(name: unknown): ValidationError | null {
  if (typeof name !== "string") {
    return { error: "AI returned invalid session name", code: AI_ERROR_CODE.INVALID_SESSION_NAME };
  }

  const trimmed = name.trim();

  if (trimmed === "") {
    return { error: "AI returned empty session name", code: AI_ERROR_CODE.INVALID_SESSION_NAME };
  }

  if (trimmed.length > MAX_SESSION_NAME_LENGTH) {
    return {
      error: `AI session name exceeds ${MAX_SESSION_NAME_LENGTH} characters`,
      code: AI_ERROR_CODE.INVALID_SESSION_NAME,
    };
  }

  if (trimmed.includes("\n") || trimmed.includes("\r")) {
    return { error: "AI session name contains newlines", code: AI_ERROR_CODE.INVALID_SESSION_NAME };
  }

  return null;
}

/**
 * Validate AI-generated tab grouping.
 *
 * Rules:
 * - Valid JSON structure
 * - Group names non-empty
 * - tabIndexes are valid numbers
 * - No duplicate indexes
 * - All indexes in bounds
 */
export function validateAIGrouping(groups: unknown, tabCount: number): ValidationError | null {
  if (!Array.isArray(groups)) {
    return {
      error: "AI returned invalid grouping structure",
      code: AI_ERROR_CODE.INVALID_GROUPING,
    };
  }

  if (groups.length === 0) {
    return { error: "AI returned no groups", code: AI_ERROR_CODE.INVALID_GROUPING };
  }

  const usedIndexes = new Set<number>();

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i] as AIGroupResult;

    if (!group || typeof group !== "object") {
      return { error: `groups[${i}] must be an object`, code: AI_ERROR_CODE.INVALID_GROUPING };
    }

    // Validate group name
    if (typeof group.name !== "string" || group.name.trim() === "") {
      return {
        error: `groups[${i}].name must be a non-empty string`,
        code: AI_ERROR_CODE.INVALID_GROUPING,
      };
    }

    // Validate tabIndexes
    if (!Array.isArray(group.tabIndexes)) {
      return {
        error: `groups[${i}].tabIndexes must be an array`,
        code: AI_ERROR_CODE.INVALID_GROUPING,
      };
    }

    if (group.tabIndexes.length === 0) {
      return {
        error: `groups[${i}].tabIndexes cannot be empty`,
        code: AI_ERROR_CODE.INVALID_GROUPING,
      };
    }

    for (const idx of group.tabIndexes) {
      // Must be a number
      if (typeof idx !== "number" || !Number.isInteger(idx)) {
        return { error: `Invalid tab index: ${idx}`, code: AI_ERROR_CODE.INVALID_GROUPING };
      }

      // Must be in bounds
      if (idx < 0 || idx >= tabCount) {
        return { error: `Tab index out of bounds: ${idx}`, code: AI_ERROR_CODE.INVALID_GROUPING };
      }

      // Must not be duplicate
      if (usedIndexes.has(idx)) {
        return { error: `Duplicate tab index: ${idx}`, code: AI_ERROR_CODE.INVALID_GROUPING };
      }

      usedIndexes.add(idx);
    }
  }

  // All tabs must be assigned
  if (usedIndexes.size !== tabCount) {
    return {
      error: `Not all tabs assigned to groups (${usedIndexes.size}/${tabCount})`,
      code: AI_ERROR_CODE.INVALID_GROUPING,
    };
  }

  return null;
}
