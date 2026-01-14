/**
 * TabFlow – Message Passing Hook
 *
 * Type-safe wrapper for chrome.runtime.sendMessage.
 * Used by popup/options to communicate with background service worker.
 */

import type { MessageActionType, MessageResponse, MessageResponseMap } from "@shared/messages";

/**
 * Send a typed message to the background service worker.
 *
 * @param action - The action to perform
 * @param payload - Optional payload data
 * @returns Promise resolving to the response data
 * @throws Error if the message fails or returns an error
 *
 * @example
 * const sessions = await sendMessage('GET_SESSIONS');
 * const session = await sendMessage('SAVE_SESSION', { name: 'My Session' });
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

/**
 * React hook for sending messages with loading and error state.
 * Returns a function that can be called to send the message.
 *
 * @example
 * const { execute, loading, error } = useMessageAction('SAVE_SESSION');
 * const handleSave = () => execute({ name: 'My Session' });
 */
export function useMessageAction<K extends MessageActionType>(action: K) {
  // This is a placeholder for a more sophisticated hook
  // that tracks loading/error state. For MVP, use sendMessage directly.
  return {
    execute: (payload?: unknown) => sendMessage(action, payload),
  };
}
