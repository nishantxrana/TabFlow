# TabFlow – System Architecture Overview

> Derived from: `tab_flow_full_architecture_roadmap_authoritative.md`

---

## Core Tech Stack (Non-Negotiable)

| Layer     | Technology                             |
| --------- | -------------------------------------- |
| Language  | TypeScript (everywhere)                |
| Extension | Chrome Manifest V3                     |
| UI        | React + Tailwind CSS                   |
| Backend   | Azure Functions (Node.js + TypeScript) |
| AI        | Small LLMs (3B–8B class)               |
| Storage   | IndexedDB + chrome.storage.local       |

---

## System Architecture Diagram

```
┌────────────────────────────┐
│        Chrome Extension     │
│  (Manifest V3, TypeScript)  │
│                              │
│  ┌──────── Popup UI ──────┐ │
│  │ React + Tailwind       │ │
│  │ (groups, search)       │ │
│  └───────────────────────┘ │
│              │               │
│  ┌──── Background SW ─────┐ │
│  │ Tab capture            │ │
│  │ Storage orchestration  │ │
│  │ AI request handling   │ │
│  └───────────────────────┘ │
│              │               │
│  ┌──── Storage Layer ─────┐ │
│  │ IndexedDB (primary)   │ │
│  │ chrome.storage.local │ │
│  └───────────────────────┘ │
└──────────────┼──────────────┘
               │ HTTPS
               ▼
┌────────────────────────────────┐
│        Azure Function App       │
│        (Node.js + TS)           │
│                                │
│  ┌──── API & Quota Layer ────┐ │
│  │ Input validation          │ │
│  │ Tier enforcement          │ │
│  │ Rate limiting             │ │
│  └──────────────────────────┘ │
│              │                 │
│  ┌──── AI Provider Layer ───┐ │
│  │ Groq / OpenAI mini       │ │
│  │ 3B–8B models             │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

---

## Component Responsibilities

### Chrome Extension (Client)

| Component                     | Responsibility                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| **Background Service Worker** | Tab capture, storage orchestration, AI request handling, undo stack, rule-based grouping |
| **Popup UI**                  | Display sessions/groups, search, trigger save/restore/auto-group, AI preview             |
| **Options Page**              | Backup settings, AI usage limits, tier indicators, export/import                         |
| **Storage Layer**             | IndexedDB for data, chrome.storage.local for settings                                    |

### Azure Function (Backend)

| Component             | Responsibility                                           |
| --------------------- | -------------------------------------------------------- |
| **API & Quota Layer** | Input validation, tier enforcement, rate limiting        |
| **AI Provider Layer** | Proxies requests to Groq/OpenAI, normalizes model output |

---

## Design Principles

These are **non-negotiable** constraints that govern all implementation decisions:

1. **Never lose user data**

   - All operations are reversible via undo stack
   - Local-first storage with multiple backup mechanisms

2. **Never auto-close tabs**

   - TabFlow manages metadata, not the browser's tab lifecycle
   - User remains in full control of their tabs

3. **AI is optional, manual, and controlled**

   - AI grouping requires explicit user trigger
   - User previews and confirms before any AI-generated grouping is applied
   - No background AI processing

4. **Performance > features**

   - Popup mount time must be <50ms
   - No heavy libraries
   - Storage operations must not block UI

5. **Trust is a feature**
   - No tracking
   - No browsing history uploaded
   - AI is opt-in only
   - Clear privacy policy

---

## Trust & Privacy Principles

| Principle        | Implementation                                                           |
| ---------------- | ------------------------------------------------------------------------ |
| No tracking      | Extension collects no analytics or behavioral data                       |
| Minimal AI input | Only tab title + domain sent to AI; never page content                   |
| Opt-in only      | AI features require explicit user action                                 |
| Local-first      | All data persists locally; cloud sync is optional and encrypted (future) |
| Transparency     | Users can export all their data as JSON at any time                      |

---

## Cost Principles

| Constraint                    | Rationale                                                   |
| ----------------------------- | ----------------------------------------------------------- |
| Small LLMs (3B–8B)            | Low latency, low cost per request                           |
| Max tabs per request (40)     | Bounds token usage                                          |
| Rate limiting per user/day    | Prevents abuse, controls cost                               |
| Cached responses (hash-based) | Avoids redundant API calls for identical tab sets           |
| Manual trigger only           | No background AI calls; user controls when cost is incurred |

---

## Tier Model

| Feature    | Free        | Pro         |
| ---------- | ----------- | ----------- |
| Saved tabs | Up to 100   | Unlimited   |
| Grouping   | Manual only | AI grouping |
| Backups    | Local only  | Cloud sync  |
| Payments   | —           | Required    |

---

## Related Documents

- [Chrome Extension Architecture](./chrome-extension.md)
- [Azure Function Architecture](./azure-function.md)
- [AI Grouping Architecture](./ai-grouping.md)
- [MVP Scope](../roadmap/mvp.md)
- [Development Phases](../roadmap/phases.md)
