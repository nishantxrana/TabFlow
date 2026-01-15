/**
 * TabFlow API – Google Gemini Provider
 *
 * Implements AI provider interface using Google's Gemini API.
 * Uses the REST API for maximum compatibility.
 *
 * Configuration:
 * - GEMINI_API_KEY: Required API key
 * - GEMINI_MODEL: Model to use (default: gemini-1.5-flash)
 */

import type { AIProvider, AICompletionOptions, AIMessage } from "./types";

// =============================================================================
// Configuration
// =============================================================================

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-1.5-flash";
const DEFAULT_TEMPERATURE = 0.2;

/**
 * Get Gemini API key from environment.
 * Throws if not configured.
 */
function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Get Gemini model to use.
 */
function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

// =============================================================================
// Request/Response Types
// =============================================================================

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
  error?: {
    message: string;
    code: number;
    status: string;
  };
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Google Gemini Provider.
 *
 * Uses Gemini's REST API for text generation.
 */
class GeminiProvider implements AIProvider {
  readonly name = "Gemini";

  async complete(options: AICompletionOptions): Promise<string> {
    const apiKey = getGeminiApiKey();
    const model = getGeminiModel();

    // Build API URL
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

    // Convert messages to Gemini format
    // Gemini uses systemInstruction separately from contents
    const systemMessage = options.messages.find((m) => m.role === "system");
    const conversationMessages = options.messages.filter((m) => m.role !== "system");

    const contents: GeminiContent[] = conversationMessages.map((m: AIMessage) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const requestBody: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        maxOutputTokens: options.maxTokens,
      },
    };

    // Add system instruction if present
    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Don't expose provider-specific error details
      const status = response.status;
      if (status === 401 || status === 403) {
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

    const data = (await response.json()) as GeminiResponse;

    if (data.error) {
      throw new Error("AI service returned an error");
    }

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("AI service returned no response");
    }

    const candidate = data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error("AI service returned empty response");
    }

    const content = candidate.content.parts[0].text;
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
 * Gemini provider singleton instance.
 */
export const geminiProvider = new GeminiProvider();
