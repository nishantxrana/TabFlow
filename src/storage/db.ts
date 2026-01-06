/**
 * TabFlow – IndexedDB Database Connection
 *
 * Handles database initialization, migrations, and connection management.
 * Uses the 'idb' library for a cleaner Promise-based API.
 */

import { DB_NAME, DB_VERSION } from "@shared/constants";

// =============================================================================
// Database Initialization (Placeholder)
// =============================================================================

/**
 * Open the TabFlow database.
 * Creates object stores on first run or upgrade.
 *
 * @returns Promise resolving to the database instance
 *
 * TODO: Implement with idb library
 */
export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open database"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create sessions store
      if (!db.objectStoreNames.contains("sessions")) {
        const sessionsStore = db.createObjectStore("sessions", { keyPath: "id" });
        sessionsStore.createIndex("byCreatedAt", "createdAt", { unique: false });
      }

      // Create undoStack store
      if (!db.objectStoreNames.contains("undoStack")) {
        db.createObjectStore("undoStack", { autoIncrement: true });
      }

      // Create backups store
      if (!db.objectStoreNames.contains("backups")) {
        db.createObjectStore("backups");
      }
    };
  });
}

/**
 * Close the database connection.
 */
export function closeDB(db: IDBDatabase): void {
  db.close();
}

