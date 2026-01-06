# TabFlow – Full Architecture, Features, UI, and Build Roadmap

> This document is the **authoritative architecture and planning reference** for TabFlow.
> It is intentionally deep, explicit, and implementation-oriented.
> All future coding, AI prompts, and decisions should align with this document.

---

## 0. CORE TECH STACK (NON-NEGOTIABLE)

- **Language:** TypeScript (everywhere)
- **Chrome Extension:** Manifest V3
- **UI Framework:** React
- **Styling:** Tailwind CSS
- **Backend:** Azure Functions (Node.js + TypeScript)
- **AI Models:** Small LLMs (3B–8B class)
- **Storage (Extension):** IndexedDB + chrome.storage.local

---

## 1. SYSTEM OVERVIEW

TabFlow is a **local-first, reliability-focused tab manager** with optional AI-powered grouping.

Design principles:
- Never lose user data
- Never auto-close tabs
- AI is optional, manual, and controlled
- Performance > features
- Trust is a feature

---

## 2. HIGH-LEVEL ARCHITECTURE

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

## 3. CHROME EXTENSION ARCHITECTURE (DETAILED)

### 3.1 Folder Structure

```
src/
├─ background/        # Service worker (core logic)
│  ├─ index.ts
│  ├─ tabCapture.ts
│  ├─ grouping.ts
│  ├─ undo.ts
│  └─ messaging.ts
│
├─ popup/             # React popup UI
│  ├─ App.tsx
│  ├─ components/
│  └─ styles.css
│
├─ options/           # React settings page
│  ├─ App.tsx
│  └─ components/
│
├─ storage/           # IndexedDB abstraction
│  ├─ db.ts
│  ├─ sessions.ts
│  └─ backups.ts
│
├─ ai/                # AI client
│  └─ aiClient.ts
│
├─ shared/            # Types, constants, utils
│  ├─ types.ts
│  └─ constants.ts
│
├─ manifest.json
└─ index.html
```

---

### 3.2 Background Service Worker (Authoritative Layer)

Responsibilities:
- Interact with `chrome.tabs`
- Capture tab metadata
- Persist sessions/groups
- Maintain undo stack
- Perform rule-based grouping
- Trigger AI grouping via Azure Function

Rules:
- Popup UI never touches Chrome APIs directly
- Popup communicates via `chrome.runtime.sendMessage`

---

### 3.3 Popup & Options UI (React)

**Popup UI**
- Display sessions and groups
- Search tabs
- Trigger save / restore / auto-group
- Preview AI grouping before apply

**Options Page**
- Backup settings
- AI usage limits
- Free vs Pro indicators
- Export / Import

UI constraints:
- Fast mount (<50ms)
- No heavy libraries
- Tailwind utility-first styling

---

## 4. STORAGE ARCHITECTURE (CRITICAL)

### 4.1 Primary Storage – IndexedDB

Used for:
- Sessions
- Groups
- Tab snapshots

Schema:
```
Session
 ├─ id
 ├─ createdAt
 ├─ groups[]

Group
 ├─ id
 ├─ name
 ├─ tabs[]

TabSnapshot
 ├─ title
 ├─ url
 ├─ domain
 ├─ favicon
 ├─ lastAccessed
```

---

### 4.2 Secondary Storage – chrome.storage.local

Used for:
- User settings
- Backup pointers
- Tier flags

---

### 4.3 Backup Strategy

- Hourly auto-backup (local)
- Manual JSON export
- Import with validation
- Undo stack (last 10 actions)

---

## 5. AI GROUPING ARCHITECTURE

### 5.1 Scope of AI

AI is used **only** to:
- Classify tabs into intent-based groups

AI does NOT:
- Read page content
- Track behavior
- Run automatically

---

### 5.2 AI Flow

```
User clicks Auto-Group
        ↓
Extension collects title + domain
        ↓
Azure Function validates request
        ↓
Small LLM groups tabs
        ↓
Azure Function validates JSON
        ↓
User preview → confirm
```

---

## 6. AZURE FUNCTION ARCHITECTURE

### 6.1 Responsibilities

- Hide AI provider keys
- Validate input schema
- Enforce quotas
- Cap tokens and tab count
- Normalize model output

---

### 6.2 Function Structure

```
/api/group-tabs
├─ inputValidator.ts
├─ quota.ts
├─ aiProvider.ts
├─ schemaValidator.ts
└─ index.ts
```

---

### 6.3 Cost & Abuse Controls

- Max tabs per request (e.g. 40)
- Max calls per user/day
- Manual trigger only
- Cached responses (hash-based)

---

## 7. SECURITY & PRIVACY

- No tracking
- No browsing history uploaded
- AI opt-in only
- Encrypted cloud sync (later)
- Clear privacy policy

---

## 8. MONETIZATION

### Free Tier
- Up to 100 saved tabs
- Manual grouping
- Local backups

### Pro Tier
- Unlimited tabs
- AI grouping
- Cloud sync

---

## 9. DEVELOPMENT ROADMAP

### Phase 1 (Weeks 1–2)
- Extension scaffold
- IndexedDB
- Save/restore tabs
- Popup UI

### Phase 2 (Week 3)
- Azure Function
- AI grouping (paid)

### Phase 3 (Week 4)
- Cloud sync
- Payments
- Launch

---

## 10. SUCCESS METRICS

- 1K installs in month 1
- <1% error rate
- 30% weekly retention
- 20% paid conversion by month 6

---

## END OF DOCUMENT

