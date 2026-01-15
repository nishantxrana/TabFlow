/**
 * TabFlow API – AI Provider Types
 *
 * Provider-agnostic interfaces for AI services.
 */

// =============================================================================
// Message Types
// =============================================================================

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// =============================================================================
// Request Options
// =============================================================================

export interface AICompletionOptions {
  messages: AIMessage[];
  maxTokens: number;
  temperature?: number;
}

// =============================================================================
// Provider Interface
// =============================================================================

/**
 * AI Provider interface.
 * All providers must implement this interface.
 */
export interface AIProvider {
  /**
   * Provider name for logging (not exposed to clients).
   */
  readonly name: string;

  /**
   * Generate a completion from the AI model.
   *
   * @param options - Completion options
   * @returns The generated text (trimmed)
   * @throws Error if the request fails
   */
  complete(options: AICompletionOptions): Promise<string>;
}
