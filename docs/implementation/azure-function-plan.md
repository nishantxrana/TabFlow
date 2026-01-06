# TabFlow – Azure Function Design Document

> This document is the **authoritative design specification** for the TabFlow Azure Function.  
> It defines a production-grade AI proxy with strict security, quota, and cost controls.  
> Do not deviate without updating this document first.

---

## 1. Function Responsibilities and Non-Responsibilities

### 1.1 What This Function DOES

| Responsibility | Description |
|----------------|-------------|
| **API Key Protection** | Hide Groq/OpenAI keys from the client; keys never leave the server |
| **Input Validation** | Validate and sanitize all incoming requests before processing |
| **Quota Enforcement** | Enforce per-user, per-tier rate limits to prevent abuse |
| **AI Orchestration** | Build prompts, call AI providers, parse responses |
| **Output Normalization** | Ensure AI responses conform to expected schema |
| **Cost Control** | Cap tokens, tabs, and requests to bound costs |
| **Fallback Handling** | Switch providers on failure; degrade gracefully |

### 1.2 What This Function DOES NOT Do

| Non-Responsibility | Rationale |
|--------------------|-----------|
| **User authentication** | Extension generates anonymous userId; no auth server |
| **Session storage** | All tab data is transient; nothing persisted after response |
| **Business logic** | Function is a proxy, not a backend; no domain logic |
| **Analytics collection** | No tracking; privacy-first design |
| **Payment processing** | Tier is passed by client; payment handled elsewhere (Phase 3) |
| **Database operations** | Only lightweight rate-limit tracking; no general DB |

---

## 2. Public API Design

### 2.1 Endpoint

```
POST /api/group-tabs
Content-Type: application/json
```

This is the **only endpoint**. There is no versioning prefix in MVP; version via header if needed later.

### 2.2 Request Schema

```typescript
interface GroupTabsRequest {
  tabs: TabInput[];          // Required. Min: 1, Max: 40
  userId: string;            // Required. Extension-generated UUID
  tier: "free" | "pro";      // Required. Determines quota limits
  requestId?: string;        // Optional. Client-generated for idempotency/debugging
}

interface TabInput {
  title: string;             // Required. Max: 200 characters
  domain: string;            // Required. Max: 253 characters (DNS limit)
}
```

**Example Request:**
```json
{
  "tabs": [
    { "title": "GitHub - TabFlow repo", "domain": "github.com" },
    { "title": "TypeScript Handbook", "domain": "typescriptlang.org" },
    { "title": "YouTube - Coding Music", "domain": "youtube.com" }
  ],
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "tier": "pro",
  "requestId": "req-abc123"
}
```

### 2.3 Response Schema

**Success Response (200 OK):**
```typescript
interface GroupTabsResponse {
  groups: GroupAssignment[];
  ungrouped: number[];       // Tab indices that couldn't be grouped
  requestId?: string;        // Echo back if provided
}

interface GroupAssignment {
  groupName: string;         // AI-generated label (max 50 chars)
  tabIndices: number[];      // Indices into original tabs[] array
}
```

**Example Success Response:**
```json
{
  "groups": [
    { "groupName": "Development", "tabIndices": [0, 1] },
    { "groupName": "Entertainment", "tabIndices": [2] }
  ],
  "ungrouped": [],
  "requestId": "req-abc123"
}
```

**Error Response (4xx/5xx):**
```typescript
interface ErrorResponse {
  error: {
    code: string;            // Machine-readable error code
    message: string;         // Human-readable message
    details?: unknown;       // Additional context (validation errors, etc.)
  };
  requestId?: string;
  retryAfter?: number;       // Seconds until retry allowed (for 429)
}
```

**Example Error Response:**
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Daily limit reached. Resets at midnight UTC.",
    "details": { "limit": 5, "used": 5, "tier": "free" }
  },
  "requestId": "req-abc123",
  "retryAfter": 3600
}
```

### 2.4 HTTP Status Codes

| Status | Condition | Error Code |
|--------|-----------|------------|
| 200 | Success | — |
| 400 | Invalid request schema | `INVALID_REQUEST` |
| 400 | Tabs array empty or exceeds 40 | `INVALID_TABS_COUNT` |
| 400 | Invalid tier value | `INVALID_TIER` |
| 429 | Quota exceeded | `QUOTA_EXCEEDED` |
| 500 | Internal server error | `INTERNAL_ERROR` |
| 502 | AI returned malformed response | `AI_RESPONSE_INVALID` |
| 503 | All AI providers unavailable | `SERVICE_UNAVAILABLE` |
| 504 | AI provider timeout | `AI_TIMEOUT` |

---

## 3. Input Validation Strategy

### 3.1 Validation Pipeline

```
Request arrives
      ↓
[1] Content-Type check (must be application/json)
      ↓
[2] JSON parse (reject malformed JSON)
      ↓
[3] Schema validation (required fields, types)
      ↓
[4] Constraint validation (limits, formats)
      ↓
[5] Sanitization (truncate, normalize)
      ↓
Proceed to quota check
```

### 3.2 Required Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `tabs` | `TabInput[]` | Yes | Non-empty array, max 40 items |
| `tabs[].title` | `string` | Yes | Non-empty, max 200 chars |
| `tabs[].domain` | `string` | Yes | Non-empty, max 253 chars, valid domain format |
| `userId` | `string` | Yes | Non-empty, max 128 chars, UUID format preferred |
| `tier` | `string` | Yes | Exactly `"free"` or `"pro"` |
| `requestId` | `string` | No | Max 64 chars if provided |

### 3.3 Size Limits

| Limit | Value | Enforcement |
|-------|-------|-------------|
| Max tabs per request | 40 | Reject with 400 if exceeded |
| Max title length | 200 chars | Truncate silently |
| Max domain length | 253 chars | Truncate silently |
| Max userId length | 128 chars | Reject with 400 if exceeded |
| Max request body size | 64 KB | Azure Functions default; sufficient |

### 3.4 Sanitization Rules

| Field | Sanitization |
|-------|--------------|
| `title` | Trim whitespace; truncate to 200 chars; strip control characters |
| `domain` | Lowercase; trim whitespace; truncate to 253 chars |
| `userId` | Trim whitespace; no other transformation |

### 3.5 Validation Error Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request validation failed",
    "details": {
      "errors": [
        { "field": "tabs", "issue": "Array exceeds maximum length of 40" },
        { "field": "tier", "issue": "Must be 'free' or 'pro'" }
      ]
    }
  }
}
```

---

## 4. Quota and Abuse Prevention

### 4.1 Per-User Limits

| Tier | Max Calls/Day | Max Tabs/Request | Reset Time |
|------|---------------|------------------|------------|
| Free | 5 | 40 | Midnight UTC |
| Pro | 50 | 40 | Midnight UTC |

### 4.2 Rate Limit Storage

**Storage: Azure Table Storage** (serverless, pay-per-request, no provisioning)

**Schema:**
```
Table: RateLimits
PartitionKey: userId
RowKey: date (YYYY-MM-DD)

Entity:
{
  userId: string,
  date: string,
  callCount: number,
  lastRequestTime: ISO timestamp
}
```

**Why Azure Table Storage:**
- Serverless (no idle cost)
- Low latency for key-value lookups
- Auto-scales
- Cheaper than Cosmos DB for simple use case

### 4.3 Rate Limit Flow

```
1. Parse userId and tier from request
      ↓
2. Query Table Storage for (userId, today's date)
      ↓
3. If no record exists → callCount = 0
      ↓
4. Check: callCount < limit for tier?
   ├─ Yes → Increment callCount, proceed
   └─ No  → Return 429 with retryAfter
      ↓
5. Write updated callCount back to Table Storage
      ↓
6. Proceed to AI call
```

### 4.4 Abuse Prevention Mechanisms

| Mechanism | Implementation |
|-----------|----------------|
| **Per-user daily cap** | Hard limit; no exceptions |
| **Request size cap** | Max 40 tabs; prevents token abuse |
| **No batch endpoints** | One grouping request at a time |
| **Manual trigger only** | Extension enforces; function has no way to verify |
| **No anonymous access** | userId required; allows tracking abuse patterns |
| **IP-based fallback** | If userId abuse detected, can add IP rate limiting (not MVP) |

### 4.5 Tier Trust Model

**Important:** The `tier` field is passed by the client and **not verified** server-side in MVP.

**Rationale:**
- No auth system in MVP
- Payment integration is Phase 3
- Abuse by lying about tier is bounded by userId rate limits

**Future:** When payments are added, tier will be verified against a license database.

---

## 5. AI Provider Abstraction

### 5.1 Provider Interface

```typescript
interface AIProvider {
  name: string;
  groupTabs(tabs: TabInput[]): Promise<RawAIResponse>;
  healthCheck(): Promise<boolean>;
}

interface RawAIResponse {
  rawJson: string;           // Raw JSON string from model
  model: string;             // Model name used
  tokensUsed: number;        // For cost tracking
  latencyMs: number;         // For observability
}
```

### 5.2 Supported Providers

| Provider | Model | Priority | Use Case |
|----------|-------|----------|----------|
| **Groq** | Llama 3 8B | Primary | Low latency, cost-effective |
| **Groq** | Mistral 7B | Secondary | Fallback within Groq |
| **OpenAI** | GPT-4o-mini | Tertiary | Fallback if Groq is down |

### 5.3 Provider Selection Logic

```
1. Try Groq (Llama 3 8B)
   ├─ Success → Return result
   └─ Failure → Log, continue
         ↓
2. Try Groq (Mistral 7B)
   ├─ Success → Return result
   └─ Failure → Log, continue
         ↓
3. Try OpenAI (GPT-4o-mini)
   ├─ Success → Return result
   └─ Failure → Return 503
```

### 5.4 Timeout Configuration

| Provider | Timeout | Rationale |
|----------|---------|-----------|
| Groq | 10 seconds | Fast inference; should complete quickly |
| OpenAI | 15 seconds | Slightly higher latency expected |

**Total request timeout:** 30 seconds (allows for one retry internally)

### 5.5 Retry Logic (Internal)

| Scenario | Retry? | Max Retries |
|----------|--------|-------------|
| Network timeout | Yes (next provider) | 2 (try all providers) |
| 5xx from provider | Yes (next provider) | 2 |
| 4xx from provider | No | 0 |
| Malformed response | Yes (same provider, once) | 1 |
| Rate limited by provider | Yes (next provider) | 2 |

### 5.6 Prompt Template

```typescript
const SYSTEM_PROMPT = `You are a browser tab organizer. Given a list of tabs with title and domain, group them by user intent.

Rules:
- Return valid JSON only
- Group names should be short (1-3 words)
- Each tab must appear in exactly one group OR in ungrouped
- Do not invent tabs; only use provided indices

Output format:
{
  "groups": [
    { "groupName": "Category", "tabIndices": [0, 1, 2] }
  ],
  "ungrouped": []
}`;

function buildUserPrompt(tabs: TabInput[]): string {
  const lines = tabs.map((t, i) => `${i}. "${t.title}" (${t.domain})`);
  return `Tabs:\n${lines.join('\n')}`;
}
```

---

## 6. Cost-Control Mechanisms

### 6.1 Token Caps

| Limit | Value | Enforcement |
|-------|-------|-------------|
| Max input tokens (estimated) | ~1000 | Enforced by 40-tab limit |
| Max output tokens | 500 | Set in AI provider config |
| Max title length | 200 chars | ~50 tokens worst case |

**Token estimation:** `40 tabs × 25 tokens avg = 1000 tokens input`

### 6.2 Request Caps

| Cap | Free Tier | Pro Tier |
|-----|-----------|----------|
| Requests per user per day | 5 | 50 |
| Requests per minute (global) | 100 | 100 |

### 6.3 Caching Strategy

**Hash-based response caching:**

```typescript
function computeCacheKey(tabs: TabInput[]): string {
  const normalized = tabs
    .map(t => `${t.domain}|${t.title.toLowerCase()}`)
    .sort()
    .join('\n');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
```

**Cache storage:** Azure Table Storage (separate table)

**Cache TTL:** 24 hours

**Cache hit flow:**
```
1. Compute cache key from tabs
2. Query cache table
3. If hit and not expired → return cached response
4. If miss → call AI, store result, return
```

**What is cached:**
- The `GroupingResult` object
- Associated with the hash of the tab set

**What is NOT cached:**
- User-specific data
- Request metadata

**Cache bypass:** No bypass mechanism in MVP. Same tabs = same result.

### 6.4 Cost Monitoring

| Metric | Tracked | Storage |
|--------|---------|---------|
| Tokens used per request | Yes | Application Insights |
| Requests per user per day | Yes | Azure Table Storage |
| Cache hit rate | Yes | Application Insights |
| Provider used per request | Yes | Application Insights |

---

## 7. Failure Handling

### 7.1 Failure Categories

| Category | HTTP Status | Recovery |
|----------|-------------|----------|
| Client error (bad input) | 400 | Client fixes request |
| Quota exceeded | 429 | Client waits for reset |
| AI provider failure | 502/503/504 | Try fallback; client retries |
| Internal error | 500 | Log; client retries |

### 7.2 AI Provider Failure

**Timeout (no response in time):**
```
- Log: provider, latency, timeout value
- Action: Try next provider
- If all fail: Return 504 with retry hint
```

**5xx from provider:**
```
- Log: provider, status code, error body (redacted)
- Action: Try next provider
- If all fail: Return 503
```

**Rate limited by provider (429):**
```
- Log: provider, rate limit headers
- Action: Try next provider immediately
- If all fail: Return 503 (do NOT return 429; that's for user quota)
```

### 7.3 Invalid Model Output

**JSON parse failure:**
```
- Log: provider, raw response (truncated, no PII)
- Action: Retry same provider once with stricter prompt
- If still fails: Try next provider
- If all fail: Return 502 AI_RESPONSE_INVALID
```

**Schema validation failure:**
```
- Log: provider, parsed JSON, validation errors
- Action: Attempt to salvage (e.g., extract valid groups)
- If unsalvageable: Return 502 AI_RESPONSE_INVALID
```

### 7.4 Salvage Logic for Partial Responses

If AI returns a response that's mostly valid but has issues:

| Issue | Salvage Strategy |
|-------|------------------|
| Missing `ungrouped` field | Default to `[]` |
| Tab index out of bounds | Remove invalid indices; add to `ungrouped` |
| Duplicate tab indices | Keep first occurrence; remove duplicates |
| Empty group name | Replace with "Other" |
| Group name too long | Truncate to 50 chars |

**If salvage fails:** Return 502; do not return partial garbage.

### 7.5 Graceful Degradation

If all AI providers fail, the function returns:
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "AI service temporarily unavailable. Please try again later."
  },
  "retryAfter": 60
}
```

The extension should:
1. Show user-friendly error
2. Suggest manual grouping
3. Offer retry button with exponential backoff

---

## 8. Security Considerations

### 8.1 API Key Storage

| Secret | Storage | Access |
|--------|---------|--------|
| Groq API key | Azure Key Vault | Function identity (MSI) |
| OpenAI API key | Azure Key Vault | Function identity (MSI) |
| Table Storage connection | Azure Key Vault | Function identity (MSI) |

**Key Vault Access:**
- Function App has Managed Service Identity (MSI)
- MSI granted `Key Vault Secrets User` role
- Keys loaded at function startup via `@azure/keyvault-secrets`

**Key Rotation:**
- Keys stored with version suffix in Key Vault
- Function reads latest version on cold start
- No restart required for rotation (next cold start picks up new key)

### 8.2 Request Authentication

**MVP: No authentication.**

The function accepts requests from any source with a valid `userId`.

**Mitigations:**
- CORS restricts browser origins (extension only)
- Rate limiting per userId
- No sensitive data returned (only grouping suggestions)

**Future (Phase 3):**
- Add `Authorization` header with extension-specific token
- Validate token against license database

### 8.3 CORS Configuration

```typescript
const ALLOWED_ORIGINS = [
  'chrome-extension://EXTENSION_ID_HERE'
];

// In function config or middleware
cors: {
  allowedOrigins: ALLOWED_ORIGINS,
  allowedMethods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400
}
```

### 8.4 Data Minimization

| Data | Stored? | Logged? | Sent to AI? |
|------|---------|---------|-------------|
| Tab titles | No | No | Yes (transient) |
| Tab domains | No | No | Yes (transient) |
| Full URLs | No | No | No |
| User ID | Transient (rate limit) | Hashed only | No |
| IP address | No | No | No |
| AI response | No (except cache) | No | N/A |

**Principle:** Data exists only for the duration of the request, except:
- Rate limit counters (userId + date + count)
- Cached responses (hash → GroupingResult, no raw tabs)

### 8.5 Input Sanitization (Security)

| Attack Vector | Mitigation |
|---------------|------------|
| JSON injection | Standard JSON.parse; no eval |
| Prompt injection | Tabs are formatted as numbered list, not interpolated into instructions |
| XSS in response | Function returns JSON only; extension must sanitize on display |
| SQL injection | No SQL; Table Storage uses parameterized queries |
| DoS via large payload | 64KB body limit; 40 tab limit; timeout |

---

## 9. Observability (Lightweight)

### 9.1 What IS Logged

| Event | Data Logged | Purpose |
|-------|-------------|---------|
| Request received | timestamp, userId (hashed), tier, tabCount | Volume tracking |
| Validation failed | error code, field names | Debug bad clients |
| Quota exceeded | userId (hashed), tier, limit, count | Abuse detection |
| AI provider called | provider, model, latencyMs, tokensUsed | Cost/perf tracking |
| AI provider failed | provider, errorType, latencyMs | Reliability tracking |
| Cache hit/miss | cacheKey (hash), hit/miss | Cache effectiveness |
| Request completed | statusCode, totalLatencyMs | SLA tracking |

### 9.2 What is NOT Logged

| Data | Reason |
|------|--------|
| Tab titles | PII; reveals browsing behavior |
| Tab domains | PII; reveals browsing behavior |
| Full request body | Contains tab data |
| AI response content | Contains grouping of user tabs |
| Raw userId | Only hashed version logged |
| IP address | Privacy; not useful for debugging |

### 9.3 Log Format

```typescript
interface LogEntry {
  timestamp: string;          // ISO 8601
  level: 'info' | 'warn' | 'error';
  event: string;              // e.g., 'request_received', 'ai_call_success'
  requestId?: string;
  userIdHash?: string;        // SHA-256 of userId
  data: Record<string, unknown>;
}
```

**Example:**
```json
{
  "timestamp": "2025-01-06T14:30:00.000Z",
  "level": "info",
  "event": "ai_call_success",
  "requestId": "req-abc123",
  "userIdHash": "a1b2c3...",
  "data": {
    "provider": "groq",
    "model": "llama-3-8b",
    "latencyMs": 342,
    "tokensUsed": 856,
    "cacheHit": false
  }
}
```

### 9.4 Metrics (Application Insights)

| Metric | Type | Dimensions |
|--------|------|------------|
| `requests_total` | Counter | status, tier |
| `request_latency_ms` | Histogram | provider, cacheHit |
| `ai_tokens_used` | Counter | provider, model |
| `quota_exceeded_total` | Counter | tier |
| `cache_hit_rate` | Gauge | — |
| `ai_provider_errors` | Counter | provider, errorType |

### 9.5 Alerting (Recommendations)

| Alert | Condition | Severity |
|-------|-----------|----------|
| High error rate | >5% of requests return 5xx | Critical |
| AI provider down | >10 consecutive failures to one provider | Warning |
| Latency spike | p95 latency >5s | Warning |
| Quota abuse pattern | Single userId hits quota repeatedly | Info |

---

## 10. Deployment & Configuration

### 10.1 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `AZURE_KEYVAULT_URL` | Key Vault URL for secrets | Yes | — |
| `GROQ_API_KEY_SECRET_NAME` | Key Vault secret name for Groq key | Yes | — |
| `OPENAI_API_KEY_SECRET_NAME` | Key Vault secret name for OpenAI key | Yes | — |
| `TABLE_STORAGE_CONNECTION_SECRET_NAME` | Key Vault secret name for Table Storage | Yes | — |
| `GROQ_TIMEOUT_MS` | Timeout for Groq calls | No | 10000 |
| `OPENAI_TIMEOUT_MS` | Timeout for OpenAI calls | No | 15000 |
| `CACHE_TTL_HOURS` | Cache entry TTL | No | 24 |
| `FREE_TIER_DAILY_LIMIT` | Max calls for free tier | No | 5 |
| `PRO_TIER_DAILY_LIMIT` | Max calls for pro tier | No | 50 |
| `MAX_TABS_PER_REQUEST` | Max tabs allowed | No | 40 |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | Yes | — |
| `NODE_ENV` | Environment (development/production) | No | production |

### 10.2 Local Development Setup

**Prerequisites:**
- Node.js 18+
- Azure Functions Core Tools v4
- Azure Storage Emulator (Azurite) for Table Storage

**local.settings.json:**
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "NODE_ENV": "development",
    "GROQ_API_KEY": "sk-...",
    "OPENAI_API_KEY": "sk-...",
    "TABLE_STORAGE_CONNECTION": "UseDevelopmentStorage=true",
    "ALLOWED_ORIGINS": "*",
    "FREE_TIER_DAILY_LIMIT": "5",
    "PRO_TIER_DAILY_LIMIT": "50"
  }
}
```

**Note:** In local dev, secrets are read directly from environment variables. In production, they're read from Key Vault.

### 10.3 Production Setup

**Azure Resources Required:**

| Resource | SKU | Purpose |
|----------|-----|---------|
| Function App | Consumption (Y1) | Serverless, pay-per-execution |
| Storage Account | Standard LRS | Table Storage for rate limits, cache |
| Key Vault | Standard | Secret storage |
| Application Insights | — | Logging and metrics |

**Deployment:**
```bash
# Build
npm run build

# Deploy via Azure CLI
az functionapp deployment source config-zip \
  --resource-group tabflow-rg \
  --name tabflow-api \
  --src dist.zip
```

**Or use GitHub Actions for CI/CD.**

### 10.4 Function App Configuration

```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "extensions": {
    "http": {
      "routePrefix": "api"
    }
  }
}
```

### 10.5 Infrastructure as Code (Bicep Snippet)

```bicep
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'tabflow-api'
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      nodeVersion: '~18'
      cors: {
        allowedOrigins: allowedOrigins
      }
    }
  }
}

resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2022-07-01' = {
  name: '${keyVault.name}/add'
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: functionApp.identity.principalId
        permissions: {
          secrets: ['get']
        }
      }
    ]
  }
}
```

---

## Summary

This design document defines a **stateless, secure AI proxy** with:

1. **Single responsibility:** Group tabs via AI; nothing else
2. **Strict validation:** All input sanitized and bounded
3. **Quota enforcement:** Per-user, per-tier limits stored in Table Storage
4. **Provider abstraction:** Groq primary, OpenAI fallback, easily swappable
5. **Cost controls:** Token caps, request caps, response caching
6. **Defensive failure handling:** Fallback providers, salvage logic, graceful degradation
7. **Security-first:** Key Vault secrets, CORS, no PII logging, data minimization
8. **Lightweight observability:** Structured logs, no sensitive data, actionable metrics
9. **Simple deployment:** Serverless, minimal infrastructure, environment-driven config

This function is designed to run at scale, survive audits, and cost less than $10/day for 1K daily Pro users.

