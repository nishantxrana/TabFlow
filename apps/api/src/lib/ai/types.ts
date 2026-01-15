/**
 * TabFlow API – AI Feature Types
 */

// =============================================================================
// Common Types
// =============================================================================

/** Tab data sent to AI (minimal, no URLs for privacy) */
export interface AITabInput {
  title: string;
  domain: string;
}

// =============================================================================
// Session Name Types
// =============================================================================

export interface AISessionNameRequest {
  tabs: AITabInput[];
}

export interface AISessionNameResponse {
  suggestedName: string;
  remaining: number;
}

// =============================================================================
// Tab Grouping Types
// =============================================================================

export interface AIGroupTabsRequest {
  tabs: AITabInput[];
}

export interface AIGroupResult {
  name: string;
  tabIndexes: number[];
}

export interface AIGroupTabsResponse {
  groups: AIGroupResult[];
  remaining: number;
}

// =============================================================================
// Quota Types
// =============================================================================

export interface QuotaRecord {
  partitionKey: string; // userId
  rowKey: string; // feature#window (e.g., session_name#2026-W03)
  count: number;
  lastUpdated: string; // ISO timestamp
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt?: string;
}
