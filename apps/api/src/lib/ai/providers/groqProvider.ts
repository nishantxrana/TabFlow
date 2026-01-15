/**
 * TabFlow API – Groq AI Provider
 *
 * Implements AI provider interface using Groq's API.
 * Uses REST API for maximum compatibility.
 *
 * Configuration:
 * - GROQ_API_KEY: Required API key
 * - GROQ_MODEL: Model to use (default: llama3-8b-8192)
 */

import type { AIProvider, AICompletionOptions, AIMessage } from "./types";

// =============================================================================
// Configuration
// =============================================================================

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";
const DEFAULT_TEMPERATURE = 0.2;

/**
 * Get Groq API key from environment.
 * Throws if not configured.
 */
function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Get Groq model to use.
 */
function getGroqModel(): string {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

// =============================================================================
// Response Types
// =============================================================================

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  error?: {
    message: string;
    type: string;
  };
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Groq AI Provider.
 *
 * Uses Groq's OpenAI-compatible API for completions.
 */
class GroqProvider implements AIProvider {
  readonly name = "Groq";

  async complete(options: AICompletionOptions): Promise<string> {
    const apiKey = getGroqApiKey();
    const model = getGroqModel();

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

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Log error for debugging (won't be exposed to client)
      const errorBody = await response.text();
      console.error(`[Groq] API error ${response.status}: ${errorBody}`);

      // Don't expose provider-specific error details to client
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

    const data = (await response.json()) as GroqResponse;

    // Debug logging for response
    console.log(`[Groq] Response: ${JSON.stringify(data).substring(0, 500)}`);

    if (data.error) {
      console.error(`[Groq] API returned error: ${JSON.stringify(data.error)}`);
      throw new Error("AI service returned an error");
    }

    if (!data.choices || data.choices.length === 0) {
      console.error(`[Groq] No choices in response`);
      throw new Error("AI service returned no response");
    }

    const content = data.choices[0].message.content;
    if (!content) {
      console.error(`[Groq] Empty content in choice: ${JSON.stringify(data.choices[0])}`);
      throw new Error("AI service returned empty response");
    }

    return content.trim();
  }
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * Groq provider singleton instance.
 */
export const groqProvider = new GroqProvider();
