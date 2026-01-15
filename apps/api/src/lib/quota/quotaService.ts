/**
 * TabFlow API – AI Quota Service
 *
 * Manages AI request quotas using Azure Table Storage.
 *
 * Schema:
 * - PartitionKey: userId
 * - RowKey: feature_window (e.g., session_name_2026-W03)
 * - count: number
 * - lastUpdated: ISO timestamp
 *
 * Window: Rolling 7-day ISO week
 */

import { TableClient, TableServiceClient, AzureNamedKeyCredential } from "@azure/data-tables";
import { AI_REQUEST_LIMIT, type AIFeature } from "../ai/constants";
import type { QuotaCheckResult } from "../ai/types";

// =============================================================================
// Configuration
// =============================================================================

const TABLE_NAME = "aiusage";

/**
 * Get Azure Storage connection info from environment.
 */
function getStorageConfig(): {
  connectionString?: string;
  accountName?: string;
  accountKey?: string;
} {
  // Try connection string first (for Azurite local dev)
  // Check both AZURE_STORAGE_CONNECTION_STRING and AzureWebJobsStorage
  const connectionString =
    process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage;
  if (connectionString) {
    return { connectionString };
  }

  // Fall back to account name + key
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (!accountName || !accountKey) {
    throw new Error("Azure Storage credentials not configured");
  }

  return { accountName, accountKey };
}

/**
 * Get or create the Table client.
 */
let tableClient: TableClient | null = null;

async function getTableClient(): Promise<TableClient> {
  if (tableClient) {
    return tableClient;
  }

  const config = getStorageConfig();

  if (config.connectionString) {
    // Use connection string (Azurite or Azure)
    const serviceClient = TableServiceClient.fromConnectionString(config.connectionString);

    // Ensure table exists
    try {
      await serviceClient.createTable(TABLE_NAME);
    } catch (error: unknown) {
      // Ignore "table already exists" error
      if (!(error instanceof Error && error.message.includes("TableAlreadyExists"))) {
        // For other errors, log but don't fail (table might exist)
        console.warn(`Table creation warning: ${error}`);
      }
    }

    tableClient = TableClient.fromConnectionString(config.connectionString, TABLE_NAME);
  } else {
    // Use account name + key
    const credential = new AzureNamedKeyCredential(config.accountName!, config.accountKey!);
    const url = `https://${config.accountName}.table.core.windows.net`;

    const serviceClient = new TableServiceClient(url, credential);

    // Ensure table exists
    try {
      await serviceClient.createTable(TABLE_NAME);
    } catch (error: unknown) {
      if (!(error instanceof Error && error.message.includes("TableAlreadyExists"))) {
        console.warn(`Table creation warning: ${error}`);
      }
    }

    tableClient = new TableClient(url, TABLE_NAME, credential);
  }

  return tableClient;
}

// =============================================================================
// ISO Week Calculation
// =============================================================================

/**
 * Get ISO week string for a date (e.g., "2026-W03").
 * Used for quota window calculation.
 */
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
}

/**
 * Get the end of the current ISO week (for reset time).
 */
function getWeekEnd(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  const daysUntilSunday = 7 - dayNum;
  d.setUTCDate(d.getUTCDate() + daysUntilSunday);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// =============================================================================
// Quota Operations
// =============================================================================

/**
 * Check and increment quota for a user+feature.
 *
 * Flow:
 * 1. Read current usage record
 * 2. If count >= limit → reject
 * 3. Increment count
 * 4. Save record
 * 5. Return result
 *
 * IMPORTANT: Increment happens BEFORE AI call (quota consumed even on failure).
 */
export async function checkAndIncrementQuota(
  userId: string,
  feature: AIFeature
): Promise<QuotaCheckResult> {
  const client = await getTableClient();
  const now = new Date();
  const window = getISOWeek(now);
  // Use underscore instead of # (# is not allowed in Azure Table keys)
  const rowKey = `${feature}_${window}`;

  try {
    // Try to get existing record
    let count = 0;
    let etag: string | undefined;

    try {
      const existing = await client.getEntity<{ count: number }>(userId, rowKey);
      count = existing.count || 0;
      etag = existing.etag;
    } catch (error: unknown) {
      // Record doesn't exist yet - that's fine
      if (!(error instanceof Error && error.message.includes("ResourceNotFound"))) {
        throw error;
      }
    }

    // Check if quota exceeded
    if (count >= AI_REQUEST_LIMIT) {
      const resetAt = getWeekEnd(now).toISOString();
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Increment count
    const newCount = count + 1;
    const entity = {
      partitionKey: userId,
      rowKey,
      count: newCount,
      lastUpdated: now.toISOString(),
    };

    if (etag) {
      // Update existing record
      await client.updateEntity(entity, "Replace", { etag });
    } else {
      // Create new record
      await client.createEntity(entity);
    }

    return {
      allowed: true,
      remaining: AI_REQUEST_LIMIT - newCount,
    };
  } catch (error) {
    // On any error, be conservative and allow the request
    // (better to over-serve than to block users incorrectly)
    console.error("Quota check error:", error);
    return {
      allowed: true,
      remaining: AI_REQUEST_LIMIT - 1, // Assume worst case
    };
  }
}

/**
 * Get remaining quota for a user+feature (read-only).
 * Used for UI to show remaining count.
 */
export async function getRemainingQuota(userId: string, feature: AIFeature): Promise<number> {
  const client = await getTableClient();
  const now = new Date();
  const window = getISOWeek(now);
  // Use underscore instead of # (# is not allowed in Azure Table keys)
  const rowKey = `${feature}_${window}`;

  try {
    const existing = await client.getEntity<{ count: number }>(userId, rowKey);
    const count = existing.count || 0;
    return Math.max(0, AI_REQUEST_LIMIT - count);
  } catch {
    // No record = full quota available
    return AI_REQUEST_LIMIT;
  }
}
