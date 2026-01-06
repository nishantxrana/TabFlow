# TabFlow – Azure Function Architecture

> Derived from: `tab_flow_full_architecture_roadmap_authoritative.md`

---

## Purpose

The Azure Function serves as a **secure, stateless proxy** between the Chrome extension and AI providers. It exists to:

1. **Hide AI provider keys** from the client
2. **Validate and sanitize input** before forwarding to AI
3. **Enforce quotas and rate limits** per user/tier
4. **Normalize model output** into a consistent schema
5. **Cap resource usage** (tokens, tab count) to control costs

---

## Tech Stack

| Component    | Technology                    |
| ------------ | ----------------------------- |
| Runtime      | Azure Functions (Node.js 18+) |
| Language     | TypeScript                    |
| AI Providers | Groq, OpenAI (mini models)    |
| Model Class  | 3B–8B parameter LLMs          |

---

## Function Structure

```
/api/group-tabs/
├─ index.ts            # Entry point, orchestrates request lifecycle
├─ inputValidator.ts   # Validates incoming request schema
├─ quota.ts            # Enforces per-user rate limits and tier caps
├─ aiProvider.ts       # Abstracts Groq/OpenAI calls
└─ schemaValidator.ts  # Validates AI response schema before returning
```

---

## Request Lifecycle

```
1. Extension sends POST /api/group-tabs
   └─ Body: { tabs: TabInput[], userId: string, tier: "free" | "pro" }

2. inputValidator.ts
   ├─ Validate JSON schema
   ├─ Reject if tabs[] exceeds max (40)
   └─ Sanitize strings (title, domain)

3. quota.ts
   ├─ Check userId against rate limit store
   ├─ Reject if daily quota exceeded
   └─ Increment call count

4. aiProvider.ts
   ├─ Build prompt from tab titles + domains
   ├─ Call Groq or OpenAI endpoint
   └─ Receive raw JSON response

5. schemaValidator.ts
   ├─ Validate AI response matches GroupingResult schema
   ├─ If malformed, return structured error
   └─ Normalize group names, deduplicate

6. Return GroupingResult to extension
```

---

## Input Schema

```typescript
interface TabInput {
  title: string; // Tab title (max 200 chars, truncated)
  domain: string; // Extracted domain (e.g., "github.com")
}

interface GroupTabsRequest {
  tabs: TabInput[]; // Max 40 items
  userId: string; // Unique user identifier (extension-generated)
  tier: "free" | "pro"; // User tier
}
```

---

## Output Schema

```typescript
interface GroupAssignment {
  groupName: string; // AI-generated group label
  tabIndices: number[]; // Indices into original tabs[] array
}

interface GroupingResult {
  groups: GroupAssignment[];
  ungrouped: number[]; // Tabs that couldn't be classified
}
```

---

## Quota & Abuse Prevention

| Control                       | Value              | Rationale                                    |
| ----------------------------- | ------------------ | -------------------------------------------- |
| Max tabs per request          | 40                 | Bounds token usage per call                  |
| Max calls per user/day (Free) | 5                  | Limit abuse on free tier                     |
| Max calls per user/day (Pro)  | 50                 | Reasonable Pro usage                         |
| Max title length              | 200 chars          | Prevent token bloat                          |
| Manual trigger only           | —                  | No background/automated calls                |
| Hash-based caching            | SHA-256 of tab set | Avoid redundant AI calls for identical input |

### Rate Limit Storage

Use Azure Table Storage or Cosmos DB (serverless) for lightweight key-value rate tracking:

```
{ partitionKey: userId, date: "2025-01-06", callCount: 3 }
```

---

## AI Provider Abstraction

The `aiProvider.ts` module abstracts the AI backend so the function can switch providers without changing the rest of the codebase.

```typescript
interface AIProvider {
  groupTabs(tabs: TabInput[]): Promise<RawAIResponse>;
}

class GroqProvider implements AIProvider { ... }
class OpenAIMiniProvider implements AIProvider { ... }
```

### Provider Selection

- Default: **Groq** (lower latency, cost-effective for small models)
- Fallback: **OpenAI mini** (if Groq is unavailable)
- Model class: **3B–8B parameters** (e.g., Llama 3 8B, Mistral 7B)

### Prompt Construction

```
System: You are a tab organizer. Given a list of browser tabs (title + domain),
group them by user intent. Return JSON only.

User:
1. "GitHub - myrepo" (github.com)
2. "Stack Overflow - async await" (stackoverflow.com)
3. "YouTube - lofi beats" (youtube.com)
...

Output format:
{
  "groups": [
    { "groupName": "Development", "tabIndices": [0, 1] },
    { "groupName": "Entertainment", "tabIndices": [2] }
  ],
  "ungrouped": []
}
```

---

## Error Handling & Fallbacks

| Scenario                | Response                                                        |
| ----------------------- | --------------------------------------------------------------- |
| Invalid input schema    | 400 Bad Request + validation errors                             |
| Quota exceeded          | 429 Too Many Requests + reset time                              |
| AI provider timeout     | 504 Gateway Timeout + retry hint                                |
| AI response malformed   | 502 Bad Gateway + raw error (logged, not exposed)               |
| AI provider unavailable | Attempt fallback provider; if all fail, 503 Service Unavailable |

### Retry Policy

- Extension should implement exponential backoff (1s, 2s, 4s) on 5xx errors.
- Do not retry 4xx errors (client-side issue).

---

## Security

| Measure       | Implementation                                                      |
| ------------- | ------------------------------------------------------------------- |
| API keys      | Stored in Azure Key Vault; loaded at function startup               |
| HTTPS only    | Azure Functions enforce TLS by default                              |
| No PII logged | Tab titles/domains are not persisted; only aggregate metrics logged |
| CORS          | Restrict to extension origin only                                   |

---

## Cost Estimation

| Factor                    | Estimate                            |
| ------------------------- | ----------------------------------- |
| Tokens per request        | ~500–1000 (40 tabs × 25 tokens avg) |
| Cost per 1K tokens (Groq) | ~$0.0001                            |
| Cost per request          | ~$0.0001–0.0002                     |
| Daily Pro user (50 calls) | ~$0.01                              |
| 1K daily Pro users        | ~$10/day                            |

---

## Related Documents

- [System Overview](./overview.md)
- [Chrome Extension Architecture](./chrome-extension.md)
- [AI Grouping Architecture](./ai-grouping.md)
