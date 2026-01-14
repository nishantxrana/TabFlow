/**
 * TabFlow – IndexedDB Database Connection
 *
 * Handles database initialization, migrations, and connection management.
 * Uses the 'idb' library for a cleaner Promise-based API.
 *
 * Object Stores:
 * - sessions: Session objects (keyPath: id, index: byCreatedAt)
 * - undoStack: UndoEntry objects (autoIncrement key)
 * - backups: BackupBlob objects (key: timestamp ISO string)
 */

import { openDB as idbOpenDB, type IDBPDatabase, type DBSchema } from "idb";
import { DB_NAME, DB_VERSION } from "@shared/constants";
import type { Session, UndoEntry, BackupBlob } from "@shared/types";

// =============================================================================
// Database Schema Definition
// =============================================================================

/**
 * Typed schema for TabFlow IndexedDB.
 * This ensures type safety when interacting with object stores.
 */
export interface TabFlowDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: {
      byCreatedAt: number;
    };
  };
  undoStack: {
    key: number;
    value: UndoEntry;
  };
  backups: {
    key: string;
    value: BackupBlob;
  };
}

/**
 * Typed database instance.
 */
export type TabFlowDB = IDBPDatabase<TabFlowDBSchema>;

// =============================================================================
// Database Connection Management
// =============================================================================

/**
 * Singleton database instance.
 * We maintain a single connection to avoid opening multiple connections.
 */
let dbInstance: TabFlowDB | null = null;

/**
 * Open the TabFlow database.
 * Creates object stores on first run or upgrade.
 * Returns cached connection if already open.
 *
 * @returns Promise resolving to the typed database instance
 * @throws StorageError if database cannot be opened
 */
export async function getDB(): Promise<TabFlowDB> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await idbOpenDB<TabFlowDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`[TabFlow] Upgrading database from v${oldVersion} to v${newVersion}`);

        // Create sessions store
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionsStore = db.createObjectStore("sessions", {
            keyPath: "id",
          });
          sessionsStore.createIndex("byCreatedAt", "createdAt", {
            unique: false,
          });
          console.log("[TabFlow] Created sessions store");
        }

        // Create undoStack store
        if (!db.objectStoreNames.contains("undoStack")) {
          db.createObjectStore("undoStack", { autoIncrement: true });
          console.log("[TabFlow] Created undoStack store");
        }

        // Create backups store
        if (!db.objectStoreNames.contains("backups")) {
          db.createObjectStore("backups");
          console.log("[TabFlow] Created backups store");
        }

        // Future migrations can be handled here based on oldVersion
        // if (oldVersion < 2) { ... }

        transaction.done.then(() => {
          console.log("[TabFlow] Database upgrade complete");
        });
      },
      blocked() {
        console.warn("[TabFlow] Database upgrade blocked. Close other tabs using TabFlow.");
      },
      blocking() {
        // Close connection to allow upgrade in another tab
        dbInstance?.close();
        dbInstance = null;
        console.warn("[TabFlow] Database connection closed for upgrade");
      },
      terminated() {
        // Connection was unexpectedly terminated
        dbInstance = null;
        console.error("[TabFlow] Database connection terminated unexpectedly");
      },
    });

    console.log("[TabFlow] Database opened successfully");
    return dbInstance;
  } catch (error) {
    dbInstance = null;
    throw new StorageError("Failed to open database", "DB_OPEN_FAILED", error);
  }
}

/**
 * Close the database connection.
 * Call this when the extension is being unloaded.
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log("[TabFlow] Database connection closed");
  }
}

/**
 * Reset the database connection.
 * Useful for testing or recovery.
 */
export async function resetDBConnection(): Promise<TabFlowDB> {
  closeDB();
  return getDB();
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for storage operations.
 * Provides structured error information for debugging.
 */
export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly cause?: unknown;

  constructor(message: string, code: StorageErrorCode, cause?: unknown) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.cause = cause;

    // Maintains proper stack trace in V8
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((Error as any).captureStackTrace) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Error as any).captureStackTrace(this, StorageError);
    }
  }
}

/**
 * Error codes for storage operations.
 */
export type StorageErrorCode =
  | "DB_OPEN_FAILED"
  | "TRANSACTION_FAILED"
  | "NOT_FOUND"
  | "QUOTA_EXCEEDED"
  | "INVALID_DATA"
  | "MIGRATION_FAILED"
  | "UNKNOWN";

/**
 * Wrap an async operation with storage error handling.
 * Converts IndexedDB errors to StorageError with appropriate codes.
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Already a StorageError, rethrow
    if (error instanceof StorageError) {
      throw error;
    }

    // Check for specific error types
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError") {
        throw new StorageError(
          `Storage quota exceeded during ${operationName}. Export your data and clear old sessions.`,
          "QUOTA_EXCEEDED",
          error
        );
      }
      if (error.name === "NotFoundError") {
        throw new StorageError(`Resource not found during ${operationName}`, "NOT_FOUND", error);
      }
      if (error.name === "TransactionInactiveError" || error.name === "InvalidStateError") {
        throw new StorageError(
          `Transaction failed during ${operationName}`,
          "TRANSACTION_FAILED",
          error
        );
      }
    }

    // Generic error
    throw new StorageError(
      `Failed to ${operationName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "UNKNOWN",
      error
    );
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a UUID v4 for session/group IDs.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp in milliseconds.
 */
export function now(): number {
  return Date.now();
}
