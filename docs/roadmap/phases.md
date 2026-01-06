# TabFlow – Development Phases

> Derived from: `tab_flow_full_architecture_roadmap_authoritative.md`

---

## Overview

TabFlow development is structured into **3 phases** over **4 weeks**.

| Phase   | Duration  | Focus                        |
| ------- | --------- | ---------------------------- |
| Phase 1 | Weeks 1–2 | Core extension, storage, UI  |
| Phase 2 | Week 3    | Azure Function, AI grouping  |
| Phase 3 | Week 4    | Cloud sync, payments, launch |

---

## Phase 1: Core Extension (Weeks 1–2)

### Objective

Build a fully functional, local-first tab manager without AI.

### Technical Milestones

| Milestone                 | Deliverable                                    |
| ------------------------- | ---------------------------------------------- |
| Extension scaffold        | Manifest V3, TypeScript, Vite/webpack build    |
| Background service worker | Tab capture, event listeners, message handling |
| IndexedDB setup           | Schema, migrations, CRUD operations            |
| Storage abstraction       | `sessions.ts`, `backups.ts`, `db.ts`           |
| Save session              | Capture all open tabs, persist to IndexedDB    |
| Restore session           | Reopen tabs from saved session                 |
| Delete session            | Remove session from storage                    |
| Popup UI (React)          | Session list, group view, search               |
| Manual grouping           | Drag-and-drop or manual assignment             |
| Undo stack                | In-memory + persisted, last 10 actions         |
| Local backup              | Hourly auto-backup via `chrome.alarms`         |
| Export/import             | JSON export, validated import                  |
| Options page              | Backup settings, tier display                  |

### Risk Checkpoints

| Risk                       | Mitigation                                             |
| -------------------------- | ------------------------------------------------------ |
| Service worker termination | Persist undo stack to IndexedDB on idle                |
| IndexedDB quota            | Monitor usage; warn user at 80%                        |
| Slow popup mount           | Profile React mount; lazy-load non-critical components |

### Exit Criteria

- Save/restore works reliably
- Undo reverts all supported actions
- Export/import preserves data integrity
- Popup mounts in <50ms

---

## Phase 2: AI Grouping (Week 3)

### Objective

Add AI-powered tab grouping via Azure Function backend.

### Technical Milestones

| Milestone                  | Deliverable                                 |
| -------------------------- | ------------------------------------------- |
| Azure Function scaffold    | Node.js + TypeScript, local dev environment |
| `/api/group-tabs` endpoint | Request handler, CORS config                |
| Input validation           | Schema validation, tab count cap (40)       |
| Quota enforcement          | Rate limiting per user/day, tier checks     |
| AI provider abstraction    | `AIProvider` interface, Groq implementation |
| Prompt engineering         | System prompt, few-shot examples            |
| Response validation        | JSON schema validation, error handling      |
| Fallback provider          | OpenAI mini as backup                       |
| Extension AI client        | `aiClient.ts`, Azure Function caller        |
| AI grouping trigger        | "Auto-Group" button in popup                |
| Preview UI                 | Display proposed groupings before apply     |
| Confirm/cancel flow        | Apply writes to storage; cancel discards    |
| Tier logic                 | Free: 5 calls/day, Pro: 50 calls/day        |
| Error handling             | Timeout, quota exceeded, malformed response |

### Risk Checkpoints

| Risk                  | Mitigation                                        |
| --------------------- | ------------------------------------------------- |
| AI response malformed | Strict JSON schema validation; fallback error     |
| Groq rate limits      | Implement exponential backoff; fallback to OpenAI |
| Cost overrun          | Hard caps on tabs/request and calls/day           |
| Latency spikes        | Set 10s timeout; show loading state               |

### Exit Criteria

- AI grouping returns valid result in >95% of requests
- Quota enforcement prevents abuse
- Preview/confirm flow works correctly
- Free/Pro tier limits are enforced

---

## Phase 3: Launch (Week 4)

### Objective

Add cloud sync, payment integration, and ship to Chrome Web Store.

### Technical Milestones

| Milestone                | Deliverable                                 |
| ------------------------ | ------------------------------------------- |
| Cloud sync backend       | Azure Storage or Cosmos DB for session data |
| Encryption               | Client-side encryption before sync          |
| Sync conflict resolution | Last-write-wins or manual merge             |
| Auth (optional)          | Anonymous ID or simple auth                 |
| Payment integration      | Stripe or similar for Pro tier              |
| Tier upgrade flow        | In-extension upgrade prompt                 |
| License validation       | Verify Pro status on extension load         |
| Chrome Web Store assets  | Icons, screenshots, description             |
| Privacy policy           | Clear, user-friendly privacy policy         |
| Store submission         | Submit for review                           |
| Launch monitoring        | Error tracking, basic metrics               |

### Risk Checkpoints

| Risk             | Mitigation                                  |
| ---------------- | ------------------------------------------- |
| Sync data loss   | Client-side encryption; backup before sync  |
| Payment failures | Graceful degradation to Free tier           |
| Store rejection  | Review manifest permissions; minimal scopes |
| Launch bugs      | Staged rollout (10% → 50% → 100%)           |

### Exit Criteria

- Cloud sync works without data loss
- Pro tier can be purchased and activated
- Extension approved on Chrome Web Store
- 1K installs in month 1 (target)

---

## Success Metrics (Post-Launch)

| Metric           | Target | Timeframe |
| ---------------- | ------ | --------- |
| Installs         | 1K     | Month 1   |
| Error rate       | <1%    | Ongoing   |
| Weekly retention | 30%    | Month 1+  |
| Paid conversion  | 20%    | Month 6   |

---

## Phase Summary

```
Week 1  ┃ Phase 1: Scaffold, IndexedDB, save/restore
Week 2  ┃ Phase 1: Popup UI, undo, backup, export/import
        ┃─────────────────────────────────────────────
Week 3  ┃ Phase 2: Azure Function, AI grouping, tiers
        ┃─────────────────────────────────────────────
Week 4  ┃ Phase 3: Cloud sync, payments, launch
```

---

## Related Documents

- [MVP Scope](./mvp.md)
- [System Overview](../architecture/overview.md)
- [Azure Function Architecture](../architecture/azure-function.md)
- [AI Grouping Architecture](../architecture/ai-grouping.md)
