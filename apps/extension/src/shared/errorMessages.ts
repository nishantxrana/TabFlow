/**
 * TabFlow – User-Friendly Error Messages
 *
 * Transforms technical errors into human-readable messages.
 * 
 * Guidelines:
 * - No technical jargon or error codes shown to users
 * - Messages suggest next action when possible
 * - Tone: calm, trustworthy, non-alarming
 */

/**
 * Error categories for consistent messaging
 */
export type ErrorCategory = 
  | "auth"
  | "network"
  | "storage"
  | "validation"
  | "unknown";

/**
 * Human-friendly error messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  "Sign-in required": "Sign in to enable Cloud Sync",
  "Sign-in was cancelled": "Sign-in was cancelled. Try again when you're ready.",
  "Session expired": "Your sign-in has expired. Please sign in again.",
  "Authentication failed": "Unable to sign in. Please try again.",
  "UNAUTHORIZED": "Please sign in to continue.",
  "SESSION_EXPIRED": "Your session has expired. Please sign in again.",
  
  // Network errors
  "Failed to fetch": "Unable to connect. Please check your internet connection.",
  "NetworkError": "Cloud sync is unavailable right now. Your local data is safe.",
  "Network request failed": "Unable to reach the server. Please try again.",
  "timeout": "This is taking longer than expected. Please try again.",
  "TIMEOUT": "Request timed out. Please try again.",
  
  // Storage errors
  "QuotaExceededError": "Storage is full. Try deleting some old sessions.",
  "Storage error": "Unable to save data. Please try again.",
  
  // Sync errors
  "Upload failed": "Unable to upload to cloud. Please try again.",
  "Download failed": "Unable to download from cloud. Please try again.",
  "No cloud backup found": "No cloud backup found for your account.",
  
  // Validation errors
  "Invalid data": "The data appears to be corrupted. Please try again.",
  "INVALID_PAYLOAD": "Unable to process the data. Please try again.",
  "INVALID_JSON": "The file format is not supported.",
};

/**
 * Default messages by category
 */
const DEFAULT_MESSAGES: Record<ErrorCategory, string> = {
  auth: "Please sign in to continue.",
  network: "Unable to connect. Please check your internet and try again.",
  storage: "Unable to save your data. Please try again.",
  validation: "Something went wrong. Please try again.",
  unknown: "Something unexpected happened. Please try again.",
};

/**
 * Detect error category from message
 */
function detectCategory(message: string): ErrorCategory {
  const lowerMessage = message.toLowerCase();
  
  if (
    lowerMessage.includes("sign") ||
    lowerMessage.includes("auth") ||
    lowerMessage.includes("session") ||
    lowerMessage.includes("unauthor")
  ) {
    return "auth";
  }
  
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("connect") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("offline")
  ) {
    return "network";
  }
  
  if (
    lowerMessage.includes("storage") ||
    lowerMessage.includes("quota") ||
    lowerMessage.includes("save")
  ) {
    return "storage";
  }
  
  if (
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("corrupt") ||
    lowerMessage.includes("format")
  ) {
    return "validation";
  }
  
  return "unknown";
}

/**
 * Get a human-friendly error message
 * 
 * @param error - The error (string, Error, or unknown)
 * @returns A user-friendly message
 */
export function getErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (!error) {
    return DEFAULT_MESSAGES.unknown;
  }
  
  // Extract message string
  let message: string;
  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    return DEFAULT_MESSAGES.unknown;
  }
  
  // Check for exact match in our mapping
  if (ERROR_MESSAGES[message]) {
    return ERROR_MESSAGES[message];
  }
  
  // Check for partial matches
  for (const [key, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return friendlyMessage;
    }
  }
  
  // If the message is already user-friendly (not technical), return it
  // Technical messages usually contain: stack traces, codes, or are very short
  const isTechnical = 
    message.includes("Error:") ||
    message.includes("Exception") ||
    message.length < 10 ||
    /^[A-Z_]+$/.test(message); // All caps error codes
  
  if (!isTechnical && message.length < 100) {
    return message;
  }
  
  // Fall back to category default
  const category = detectCategory(message);
  return DEFAULT_MESSAGES[category];
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const message = typeof error === "string" ? error : (error instanceof Error ? error.message : "");
  return detectCategory(message) === "auth";
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  const message = typeof error === "string" ? error : (error instanceof Error ? error.message : "");
  return detectCategory(message) === "network";
}

