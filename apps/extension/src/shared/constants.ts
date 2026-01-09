/**
 * TabFlow – Configuration Constants
 * All magic numbers and config values in one place.
 */

// =============================================================================
// IndexedDB Configuration
// =============================================================================

export const DB_NAME = "tabflow";
export const DB_VERSION = 1;

// =============================================================================
// Storage Limits
// =============================================================================

/** Maximum tabs allowed for free tier */
export const MAX_TABS_FREE = 100;

/** Maximum tabs allowed for pro tier */
export const MAX_TABS_PRO = Infinity;

/** Maximum tabs per AI grouping request */
export const MAX_TABS_PER_AI_REQUEST = 40;

/** Maximum undo history depth */
export const MAX_UNDO_DEPTH = 10;

/** Maximum backups to retain in IndexedDB */
export const MAX_BACKUPS_RETAINED = 24;

// =============================================================================
// Timing Configuration
// =============================================================================

/** Default backup interval in minutes */
export const BACKUP_INTERVAL_MINUTES = 60;

/** Debounce delay for undo stack persistence (ms) */
export const UNDO_PERSIST_DEBOUNCE_MS = 500;

/** Debounce delay for settings save (ms) */
export const SETTINGS_SAVE_DEBOUNCE_MS = 300;

/** Debounce delay for search input (ms) */
export const SEARCH_DEBOUNCE_MS = 200;

// =============================================================================
// UI Configuration
// =============================================================================

/** Popup width in pixels */
export const POPUP_WIDTH_PX = 400;

/** Popup max height in pixels */
export const POPUP_MAX_HEIGHT_PX = 600;

/** Error toast auto-dismiss time (ms) */
export const ERROR_TOAST_DURATION_MS = 5000;

/** Maximum session name length (characters) */
export const MAX_SESSION_NAME_LENGTH = 50;

// =============================================================================
// Alarm Names
// =============================================================================

export const ALARM_HOURLY_BACKUP = "hourlyBackup";

// =============================================================================
// Cloud Sync Configuration
// =============================================================================

/**
 * Cloud sync API base URL.
 *
 * Uses Vite environment variable:
 * - Development: Set VITE_CLOUD_API_URL in .env.development
 * - Production: Set VITE_CLOUD_API_URL in .env.production
 *
 * Fallback to localhost for local development.
 */
export const CLOUD_API_BASE_URL =
  import.meta.env.VITE_CLOUD_API_URL || "http://localhost:3000";

/** Cloud sync schema version */
export const CLOUD_SYNC_SCHEMA_VERSION = 1;

/** Encryption key derivation salt (must match across sessions) */
export const ENCRYPTION_SALT = "tabflow-v1";

