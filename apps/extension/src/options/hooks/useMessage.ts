/**
 * TabFlow – Options Message Passing Hook
 *
 * Type-safe wrapper for chrome.runtime.sendMessage.
 * Used by options page to communicate with background service worker.
 */

import type { MessageActionType, MessageResponse, MessageResponseMap } from "@shared/messages";

/**
 * Send a typed message to the background service worker.
 *
 * @param action - The action to perform
 * @param payload - Optional payload data
 * @returns Promise resolving to the response data
 * @throws Error if the message fails or returns an error
 */
export async function sendMessage<K extends MessageActionType>(
  action: K,
  payload?: unknown
): Promise<MessageResponseMap[K]> {
  const response: MessageResponse<MessageResponseMap[K]> = await chrome.runtime.sendMessage({
    action,
    payload,
  });

  if (!response.success) {
    throw new Error(response.error || "Unknown error");
  }

  return response.data as MessageResponseMap[K];
}
