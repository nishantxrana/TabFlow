/**
 * TabFlow API – AI Service
 *
 * Provider-agnostic AI service for session naming and tab grouping.
 * Delegates to the configured provider based on AI_PROVIDER env var.
 *
 * Supported providers:
 * - groq (default)
 * - openai
 * - gemini
 *
 * Prompts are designed for safety and predictability.
 * All outputs are treated as untrusted and must be validated by callers.
 */

import { MAX_SESSION_NAME_LENGTH } from "./constants";
import type { AITabInput, AIGroupResult } from "./types";
import { groqProvider, openaiProvider, geminiProvider, type AIProvider } from "./providers";

// =============================================================================
// Provider Selection
// =============================================================================

/**
 * Supported AI provider names.
 */
const SUPPORTED_PROVIDERS = ["groq", "openai", "gemini"] as const;
type ProviderName = (typeof SUPPORTED_PROVIDERS)[number];

/**
 * Default provider if AI_PROVIDER is not set or invalid.
 */
const DEFAULT_PROVIDER: ProviderName = "groq";

/**
 * Get the provider name from environment.
 * Returns default if not set or invalid.
 */
function getProviderName(): ProviderName {
  const envValue = process.env.AI_PROVIDER?.toLowerCase();

  if (!envValue) {
    return DEFAULT_PROVIDER;
  }

  if (SUPPORTED_PROVIDERS.includes(envValue as ProviderName)) {
    return envValue as ProviderName;
  }

  // Invalid provider name - use default
  console.warn(`[AI] Invalid AI_PROVIDER "${envValue}". Using default: ${DEFAULT_PROVIDER}`);
  return DEFAULT_PROVIDER;
}

/**
 * Provider instances mapped by name.
 */
const PROVIDER_MAP: Record<ProviderName, AIProvider> = {
  groq: groqProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
};

/**
 * Get the current AI provider based on AI_PROVIDER env var.
 *
 * Selection:
 * - AI_PROVIDER=groq   → Groq (llama3-8b-8192)
 * - AI_PROVIDER=openai → OpenAI (gpt-4o-mini)
 * - AI_PROVIDER=gemini → Google Gemini (gemini-1.5-flash)
 * - Not set or invalid → Groq (default)
 *
 * Note: Provider-specific env vars (API keys) are validated
 * at call time, not at selection time.
 */
function getProvider(): AIProvider {
  const providerName = getProviderName();
  return PROVIDER_MAP[providerName];
}

// =============================================================================
// Session Name Generation
// =============================================================================

/**
 * Generate a session name suggestion based on tab titles and domains.
 *
 * Returns the raw AI output (caller must validate).
 */
export async function generateSessionName(tabs: AITabInput[]): Promise<string> {
  const provider = getProvider();

  // Prepare tab list for prompt (limit context size)
  const tabList = tabs
    .slice(0, 30) // Only use first 30 for prompt efficiency
    .map((t, i) => `${i + 1}. ${t.title} (${t.domain})`)
    .join("\n");

  const systemPrompt = `You are a helpful assistant that suggests short, descriptive session names for browser tab collections.

Rules:
- Suggest exactly ONE session name
- Use 2-6 words maximum
- Be neutral and professional
- NO emojis
- NO dates or timestamps
- NO marketing language or exclamation marks
- Output must be ${MAX_SESSION_NAME_LENGTH} characters or less
- Output ONLY the session name, nothing else`;

  const userPrompt = `Based on these browser tabs, suggest a short session name:

${tabList}`;

  return provider.complete({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 30, // Short name only
    temperature: 0.2,
  });
}

// =============================================================================
// Tab Grouping Generation
// =============================================================================

/**
 * Generate tab grouping suggestions based on tab titles and domains.
 *
 * Returns parsed groups (caller must validate).
 */
export async function generateTabGroups(tabs: AITabInput[]): Promise<AIGroupResult[]> {
  const provider = getProvider();

  // Prepare tab list for prompt
  const tabList = tabs.map((t, i) => `${i}: ${t.title} (${t.domain})`).join("\n");

  const systemPrompt = `You are a helpful assistant that groups browser tabs by topic or category.

Rules:
- Create logical groups based on content similarity
- Use 2-4 groups for most cases (never more than 8)
- Group names should be 1-3 words
- NO emojis in group names
- Every tab must be assigned to exactly one group
- Output ONLY valid JSON, no explanation

Output format (strict JSON):
{
  "groups": [
    { "name": "Group Name", "tabIndexes": [0, 1, 2] },
    { "name": "Another Group", "tabIndexes": [3, 4] }
  ]
}`;

  const userPrompt = `Group these tabs by topic. Tab indexes start at 0.

${tabList}`;

  const response = await provider.complete({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 200, // Minimal tokens for JSON structure
    temperature: 0.2,
  });

  // Parse JSON response
  // Handle potential markdown code blocks
  let jsonStr = response;
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as { groups: AIGroupResult[] };

  if (!parsed.groups) {
    throw new Error("AI response missing groups field");
  }

  return parsed.groups;
}

// =============================================================================
// Provider Info (for debugging/logging only)
// =============================================================================

/**
 * Get the name of the currently configured provider.
 * Used for logging/debugging only - never expose to clients.
 */
export function getCurrentProviderName(): string {
  return getProvider().name;
}
