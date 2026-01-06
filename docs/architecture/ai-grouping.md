# TabFlow – AI Grouping Architecture

> Derived from: `tab_flow_full_architecture_roadmap_authoritative.md`

---

## Why AI is Needed

Manual tab grouping is tedious. Users with 20+ open tabs rarely organize them. TabFlow's AI grouping provides **intent-based classification** that:

- Groups tabs by semantic purpose (e.g., "Research", "Shopping", "Work")
- Handles ambiguous tabs better than rule-based approaches
- Reduces cognitive load for users with tab overload

AI is **not** used for:

- Reading page content
- Tracking user behavior
- Running automatically in the background

---

## When AI Runs

AI grouping is **manual-only**. It runs when:

1. User clicks "Auto-Group" button in the popup UI
2. Extension collects tab metadata (title + domain)
3. Request is sent to Azure Function
4. User **previews** the proposed grouping
5. User **confirms** to apply

AI never runs without explicit user action. There is no background processing, no scheduled AI calls, no automatic triggering.

---

## AI Flow Diagram

```
User clicks "Auto-Group"
        ↓
Extension collects tab metadata
(title + domain only)
        ↓
Background SW sends request to Azure Function
        ↓
Azure Function validates request
(schema, quota, tier)
        ↓
Small LLM (3B–8B) generates groupings
        ↓
Azure Function validates response JSON
        ↓
Extension receives GroupingResult
        ↓
Popup UI displays preview
        ↓
User confirms → grouping applied
User cancels → no change
```

---

## Input/Output Schema

### Input (Extension → Azure Function)

```typescript
interface TabInput {
  title: string; // Max 200 chars
  domain: string; // e.g., "github.com"
}

interface GroupTabsRequest {
  tabs: TabInput[]; // Max 40 items
  userId: string; // Extension-generated unique ID
  tier: "free" | "pro";
}
```

**What is NOT sent:**

- Full URL (only domain)
- Page content
- Browsing history
- User identity or email

### Output (Azure Function → Extension)

```typescript
interface GroupAssignment {
  groupName: string; // AI-generated label
  tabIndices: number[]; // References to input tabs[]
}

interface GroupingResult {
  groups: GroupAssignment[];
  ungrouped: number[]; // Tabs that couldn't be classified
}
```

---

## Small-Model Strategy (3B–8B)

### Why Small Models?

| Factor                    | Small Model (3B–8B) | Large Model (70B+) |
| ------------------------- | ------------------- | ------------------ |
| Latency                   | 200–500ms           | 2–5s               |
| Cost                      | $0.0001/req         | $0.01+/req         |
| Accuracy for tab grouping | Sufficient          | Overkill           |
| Self-hosting feasibility  | Possible (future)   | Impractical        |

Tab grouping is a **bounded classification task**. Small models perform well because:

- Input is short (title + domain per tab)
- Output is structured JSON
- No complex reasoning required
- Task can be guided with few-shot prompts

### Target Models

| Provider | Model       | Parameters     |
| -------- | ----------- | -------------- |
| Groq     | Llama 3 8B  | 8B             |
| Groq     | Mistral 7B  | 7B             |
| OpenAI   | GPT-4o-mini | ~8B equivalent |

### Prompt Design

```
System:
You are a browser tab organizer. Given a list of tabs with title and domain,
group them by user intent. Return valid JSON only. Be concise with group names.

User:
Tabs:
1. "Pull Request #42 - myrepo" (github.com)
2. "async/await in JavaScript" (stackoverflow.com)
3. "TypeScript Handbook" (typescriptlang.org)
4. "Best noise-canceling headphones 2025" (wirecutter.com)
5. "Sony WH-1000XM5 - Amazon" (amazon.com)

Respond with JSON:
{
  "groups": [
    { "groupName": "...", "tabIndices": [...] }
  ],
  "ungrouped": [...]
}
```

---

## Failure Handling

### AI Request Failures

| Failure Mode          | Handling                                                     |
| --------------------- | ------------------------------------------------------------ |
| Network timeout       | Show error toast; offer retry button                         |
| Quota exceeded        | Show upgrade prompt (Free) or "try again tomorrow" (Pro)     |
| Malformed AI response | Log error; show generic failure message; do not crash        |
| AI provider down      | Attempt fallback provider; if all fail, graceful degradation |

### Graceful Degradation

If AI grouping fails entirely:

- Extension remains fully functional
- Manual grouping still works
- Saved sessions are unaffected
- User is informed but not blocked

### Validation Failures

If the AI returns malformed JSON or invalid schema:

- Azure Function returns 502 with error code
- Extension shows: "AI couldn't group your tabs. Try again or group manually."
- No partial groupings are applied

---

## Preview & Confirm Flow

AI groupings are **never applied automatically**. The flow is:

1. User triggers AI grouping
2. Extension shows loading state
3. On success, popup displays **preview panel**:
   - List of proposed groups with tab assignments
   - User can see exactly what will change
4. User clicks **"Apply"** to confirm
5. Grouping is written to storage
6. Undo action is pushed to stack

If user clicks **"Cancel"**:

- No changes are made
- No undo entry created
- Request is discarded

---

## Privacy Guarantees

| Guarantee            | Implementation                                   |
| -------------------- | ------------------------------------------------ |
| No page content sent | Only `document.title` and parsed domain          |
| No URL paths sent    | `github.com`, not `github.com/user/repo/pull/42` |
| No browsing history  | Only currently open tabs at request time         |
| No PII               | No email, no account info, no cookies            |
| Opt-in only          | AI features require explicit user action         |
| Data not stored      | Azure Function does not persist tab data         |

---

## Cost Controls

| Control                 | Value                    |
| ----------------------- | ------------------------ |
| Max tabs per request    | 40                       |
| Max requests/day (Free) | 5                        |
| Max requests/day (Pro)  | 50                       |
| Cached responses        | Hash-based deduplication |
| Token cap               | ~1000 tokens per request |

---

## Future Considerations (Not MVP)

- **Local model option**: Run small model on-device for privacy-conscious users
- **Custom group templates**: User-defined group categories
- **Learning from corrections**: Improve groupings based on user edits (opt-in)

These are explicitly **not in scope** for the MVP.

---

## Related Documents

- [System Overview](./overview.md)
- [Azure Function Architecture](./azure-function.md)
- [MVP Scope](../roadmap/mvp.md)
