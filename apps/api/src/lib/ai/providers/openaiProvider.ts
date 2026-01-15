/**
 * TabFlow API – OpenAI Provider
 *
 * Implements AI provider interface using OpenAI's API.
 * Uses the standard chat completions endpoint.
 *
 * Configuration:
 * - OPENAI_API_KEY: Required API key
 * - OPENAI_MODEL: Model to use (default: gpt-4o-mini)
 */

import type { AIProvider, AICompletionOptions, AIMessage } from "./types";

// =============================================================================
// Configuration
// =============================================================================

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.2;

/**
 * Get OpenAI API key from environment.
 * Throws if not configured.
 */
function getOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Get OpenAI model to use.
 */
function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

// =============================================================================
// Response Types
// =============================================================================

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * OpenAI Provider.
 *
 * Uses OpenAI's chat completions API.
 */
class OpenAIProvider implements AIProvider {
  readonly name = "OpenAI";

  async complete(options: AICompletionOptions): Promise<string> {
    const apiKey = getOpenAIApiKey();
    const model = getOpenAIModel();

    const requestBody = {
      model,
      messages: options.messages.map((m: AIMessage) => ({
        role: m.role,
        content: m.content,
      })),
      max_completion_tokens: options.maxTokens,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      stream: false,
    };

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Don't expose provider-specific error details
      const status = response.status;
      if (status === 401) {
        throw new Error("AI service authentication failed");
      }
      if (status === 429) {
        throw new Error("AI service rate limit exceeded");
      }
      if (status >= 500) {
        throw new Error("AI service temporarily unavailable");
      }
      throw new Error("AI service request failed");
    }

    const data = (await response.json()) as OpenAIResponse;

    if (data.error) {
      throw new Error("AI service returned an error");
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error("AI service returned no response");
    }

    const content = data.choices[0].message.content;
    if (!content) {
      throw new Error("AI service returned empty response");
    }

    return content.trim();
  }
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * OpenAI provider singleton instance.
 */
export const openaiProvider = new OpenAIProvider();
