# TabFlow – Chrome Extension Implementation Plan

> This document is the **authoritative implementation guide** for the TabFlow Chrome Extension.  
> Engineers should follow this precisely. Do not deviate without updating this document first.

---

## 1. Final Folder Structure

```
tabflow/
├── src/
│   ├── background/                 # Service Worker (OWNS all Chrome API access)
│   │   ├── index.ts                # Entry point: event registration, init
│   │   ├── tabCapture.ts           # chrome.tabs queries, metadata extraction
│   │   ├── grouping.ts             # Rule-based grouping + AI orchestration
│   │   ├── undo.ts                 # Undo stack: push, pop, persist, rehydrate
│   │   ├── messaging.ts            # Message router: action → handler mapping
│   │   └── alarms.ts               # chrome.alarms: hourly backup scheduling
│   │
│   ├── popup/                      # React Popup UI (STATELESS relative to Chrome)
│   │   ├── index.tsx               # React root mount
│   │   ├── App.tsx                 # Root component, message dispatch
│   │   ├── components/
│   │   │   ├── SessionList.tsx     # List of saved sessions
│   │   │   ├── SessionCard.tsx     # Single session display
│   │   │   ├── GroupView.tsx       # Tabs grouped within a session
│   │   │   ├── TabItem.tsx         # Single tab row
│   │   │   ├── SearchBar.tsx       # Filter tabs by title/domain
│   │   │   ├── ActionBar.tsx       # Save, Restore, Auto-Group buttons
│   │   │   ├── AIPreview.tsx       # AI grouping preview modal
│   │   │   ├── LoadingState.tsx    # Skeleton / spinner
│   │   │   └── ErrorToast.tsx      # Error display
│   │   ├── hooks/
│   │   │   ├── useMessage.ts       # Wrapper for chrome.runtime.sendMessage
│   │   │   └── useSessions.ts      # Fetch sessions on mount
│   │   └── styles.css              # Tailwind imports
│   │
│   ├── options/                    # React Options Page
│   │   ├── index.tsx               # React root mount
│   │   ├── App.tsx                 # Root component
│   │   ├── components/
│   │   │   ├── SettingsForm.tsx    # User preferences form
│   │   │   ├── BackupSection.tsx   # Export/Import controls
│   │   │   ├── TierDisplay.tsx     # Free/Pro indicator
│   │   │   └── UsageStats.tsx      # AI calls remaining (Pro)
│   │   └── styles.css              # Tailwind imports
│   │
│   ├── storage/                    # IndexedDB Abstraction (SHARED)
│   │   ├── db.ts                   # DB open, migrations, version management
│   │   ├── sessions.ts             # Session CRUD
│   │   ├── groups.ts               # Group CRUD
│   │   ├── undoStore.ts            # Undo stack persistence
│   │   └── backups.ts              # Backup read/write
│   │
│   ├── ai/                         # AI Client (USED ONLY BY BACKGROUND)
│   │   └── aiClient.ts             # Azure Function HTTP client
│   │
│   ├── shared/                     # Types, Constants (NO RUNTIME DEPENDENCIES)
│   │   ├── types.ts                # All TypeScript interfaces
│   │   ├── constants.ts            # Config values, limits
│   │   ├── messages.ts             # Message action constants
│   │   └── validators.ts           # Runtime schema validation
│   │
│   └── manifest.json               # Manifest V3
│
├── public/
│   ├── popup.html                  # Popup mount target
│   ├── options.html                # Options mount target
│   └── icons/                      # Extension icons (16, 48, 128)
│
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts                  # Or webpack.config.js
└── package.json
```

### Responsibility Boundaries

| Directory     | Owner           | Can Access                                     |
| ------------- | --------------- | ---------------------------------------------- |
| `background/` | Service Worker  | chrome.\*, IndexedDB, AI client                |
| `popup/`      | Popup UI        | React state, `chrome.runtime.sendMessage` only |
| `options/`    | Options UI      | React state, `chrome.runtime.sendMessage` only |
| `storage/`    | Shared          | IndexedDB (accessed from background)           |
| `ai/`         | Background only | Azure Function endpoint                        |
| `shared/`     | All             | Types, constants (no side effects)             |

---

## 2. Background Service Worker Design

### 2.1 Entry Point (`background/index.ts`)

```
Responsibilities:
├── Register chrome.runtime.onInstalled → run migrations
├── Register chrome.runtime.onMessage → route to messaging.ts
├── Register chrome.alarms.onAlarm → trigger backup
├── Rehydrate undo stack from IndexedDB on wake-up
└── Initialize DB connection
```

**Lifecycle Awareness:**

- Service worker is **ephemeral**. Chrome terminates it after ~30s of inactivity.
- On every wake-up, `index.ts` must:
  1. Open IndexedDB connection
  2. Load undo stack from `undoStore`
  3. Load settings from `chrome.storage.local`

**No Long-Running State:**

- Do not rely on in-memory state persisting across wake-ups.
- The undo stack is kept in memory during active use but flushed to IndexedDB:
  - On every push/pop operation (debounced 500ms)
  - Immediately before service worker terminates (best-effort)

### 2.2 Chrome API Interactions

| API                            | Used In              | Purpose                               |
| ------------------------------ | -------------------- | ------------------------------------- |
| `chrome.tabs.query`            | `tabCapture.ts`      | Get all open tabs                     |
| `chrome.tabs.create`           | `grouping.ts`        | Restore tabs from session             |
| `chrome.tabs.get`              | `tabCapture.ts`      | Get single tab metadata               |
| `chrome.runtime.onMessage`     | `messaging.ts`       | Receive messages from popup/options   |
| `chrome.runtime.sendMessage`   | N/A in background    | Background does not send; it responds |
| `chrome.storage.local.get/set` | `index.ts`, handlers | Read/write settings, tier, pointers   |
| `chrome.alarms.create`         | `alarms.ts`          | Schedule hourly backup                |
| `chrome.alarms.onAlarm`        | `alarms.ts`          | Execute backup                        |

### 2.3 Storage Coordination

```
┌─────────────────────────────────────────────────────────────┐
│                    Background Service Worker                 │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │ tabCapture  │    │  grouping   │    │    undo     │      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘      │
│         │                  │                  │              │
│         └────────────┬─────┴──────────────────┘              │
│                      │                                       │
│              ┌───────▼───────┐                               │
│              │   storage/*   │                               │
│              │  (IndexedDB)  │                               │
│              └───────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

**Transaction Flow (Save Session):**

1. `tabCapture.ts` queries `chrome.tabs.query({ currentWindow: true })`
2. Extract: `{ title, url, domain, favicon, lastAccessed }`
3. `sessions.ts` opens IndexedDB transaction (readwrite)
4. Write `Session` object with embedded `TabSnapshot[]`
5. `undo.ts` pushes `{ type: 'SAVE_SESSION', sessionId }` to stack
6. Respond to popup with `{ success: true, sessionId }`

### 2.4 AI Trigger Coordination

```
Popup sends: TRIGGER_AI_GROUP
        ↓
messaging.ts routes to grouping.ts
        ↓
grouping.ts calls tabCapture.ts
        ↓
tabCapture.ts returns TabInput[] (title + domain only)
        ↓
grouping.ts calls aiClient.ts
        ↓
aiClient.ts POSTs to Azure Function
        ↓
Azure Function returns GroupingResult
        ↓
grouping.ts returns result to messaging.ts
        ↓
messaging.ts responds to popup with GroupingResult
        ↓
Popup displays preview (NO WRITE YET)
        ↓
User confirms → Popup sends APPLY_GROUPING
        ↓
grouping.ts writes to IndexedDB
        ↓
undo.ts pushes undo entry
```

---

## 3. Popup UI Architecture (React)

### 3.1 Component Hierarchy

```
App.tsx
├── ActionBar.tsx
│   ├── [Save Session] button
│   ├── [Auto-Group] button (Pro only)
│   └── [Undo] button
│
├── SearchBar.tsx
│   └── <input> with debounced filter
│
├── SessionList.tsx
│   └── SessionCard.tsx (×N)
│       ├── Session header (name, date, tab count)
│       ├── [Restore] button
│       ├── [Delete] button
│       └── GroupView.tsx
│           └── TabItem.tsx (×N)
│
├── AIPreview.tsx (modal, conditionally rendered)
│   ├── Proposed groups list
│   ├── [Apply] button
│   └── [Cancel] button
│
├── LoadingState.tsx (skeleton)
└── ErrorToast.tsx (transient)
```

### 3.2 State Management Strategy

**No external state library.** Use React's built-in primitives only:

| State           | Location                                  | Rationale                      |
| --------------- | ----------------------------------------- | ------------------------------ |
| Sessions list   | `useSessions` hook (useState + useEffect) | Fetched on mount               |
| Search filter   | Local `useState` in `SearchBar`           | UI-only, not persisted         |
| AI preview data | Local `useState` in `App`                 | Transient, discarded on cancel |
| Loading states  | Local `useState` per async action         | Scoped to triggering component |
| Error messages  | Local `useState` in `App`                 | Cleared on next action         |

**Data Flow:**

```
Mount → useEffect → sendMessage(GET_SESSIONS) → setSessions(data)
                                                      ↓
                                              SessionList renders
```

**No Prop Drilling Beyond 2 Levels:**

- If a component 3+ levels deep needs data, lift state to `App` and pass via props.
- Do not introduce Context for MVP; complexity not justified.

### 3.3 Message Communication

**`hooks/useMessage.ts`:**

```typescript
type MessageResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function sendMessage<T>(action: string, payload?: unknown): Promise<T> {
  const response: MessageResult<T> = await chrome.runtime.sendMessage({
    action,
    payload,
  });
  if (!response.success) throw new Error(response.error);
  return response.data;
}
```

**Usage Pattern:**

```typescript
// In component
const handleSave = async () => {
  setLoading(true);
  try {
    const session = await sendMessage<Session>("SAVE_SESSION");
    setSessions((prev) => [session, ...prev]);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### 3.4 Performance Constraints

| Constraint     | Implementation                                                                            |
| -------------- | ----------------------------------------------------------------------------------------- |
| Mount < 50ms   | No lazy loading on initial render path                                                    |
| No heavy deps  | React + Tailwind only; no Redux, no Zustand, no React Query                               |
| Skeleton first | Render `<LoadingState />` immediately; swap when data arrives                             |
| Cached data    | On mount, check `chrome.storage.local` for last sessions snapshot (optional optimization) |

---

## 4. Options Page Architecture (React)

### 4.1 Settings Model

```typescript
interface Settings {
  autoBackup: boolean; // Default: true
  backupFrequencyHours: number; // Default: 1 (hourly)
  aiOptIn: boolean; // Default: false (must opt in)
}
```

**Stored in:** `chrome.storage.local` under key `"settings"`

### 4.2 Component Structure

```
App.tsx
├── TierDisplay.tsx
│   └── Shows "Free" or "Pro" badge
│   └── Shows AI calls remaining (Pro)
│
├── SettingsForm.tsx
│   ├── Auto-backup toggle
│   ├── Backup frequency dropdown (1h, 6h, 24h)
│   └── AI opt-in checkbox
│
├── BackupSection.tsx
│   ├── [Export Data] button → triggers JSON download
│   ├── [Import Data] button → file picker
│   └── Last backup timestamp display
│
└── UsageStats.tsx (Pro only)
    └── AI requests: X / 50 today
```

### 4.3 Persistence Strategy

**Read on mount:**

```typescript
useEffect(() => {
  sendMessage<Settings>("GET_SETTINGS").then(setSettings);
}, []);
```

**Write on change (debounced):**

```typescript
const handleChange = (key: keyof Settings, value: unknown) => {
  const updated = { ...settings, [key]: value };
  setSettings(updated);
  debouncedSave(updated); // 300ms debounce
};

const debouncedSave = debounce((s: Settings) => {
  sendMessage("UPDATE_SETTINGS", s);
}, 300);
```

### 4.4 Export/Import Flow

**Export:**

1. Options page sends `EXPORT_DATA` message
2. Background reads all sessions from IndexedDB
3. Background serializes to JSON string
4. Background returns JSON to Options page
5. Options page triggers `<a download>` with blob URL

**Import:**

1. User selects JSON file
2. Options page reads file as text
3. Options page sends `IMPORT_DATA` with JSON payload
4. Background validates schema (using `validators.ts`)
5. If valid: clear existing sessions, write imported data
6. Background pushes undo entry: `{ type: 'IMPORT', previousData: [...] }`
7. Return success/failure to Options page

---

## 5. Message-Passing Contracts

### 5.1 Message Shape

```typescript
// shared/messages.ts

// Request
interface Message<T = unknown> {
  action: MessageAction;
  payload?: T;
}

// Response
interface Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Action constants
const MessageAction = {
  // Session management
  GET_SESSIONS: "GET_SESSIONS",
  SAVE_SESSION: "SAVE_SESSION",
  RESTORE_SESSION: "RESTORE_SESSION",
  DELETE_SESSION: "DELETE_SESSION",

  // Grouping
  TRIGGER_AI_GROUP: "TRIGGER_AI_GROUP",
  APPLY_GROUPING: "APPLY_GROUPING",

  // Undo
  UNDO: "UNDO",
  GET_UNDO_STACK: "GET_UNDO_STACK",

  // Settings
  GET_SETTINGS: "GET_SETTINGS",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",

  // Backup
  EXPORT_DATA: "EXPORT_DATA",
  IMPORT_DATA: "IMPORT_DATA",

  // Tier
  GET_TIER: "GET_TIER",
} as const;
```

### 5.2 Request/Response Specifications

| Action             | Payload                 | Response Data                  | Side Effects                       |
| ------------------ | ----------------------- | ------------------------------ | ---------------------------------- |
| `GET_SESSIONS`     | —                       | `Session[]`                    | None                               |
| `SAVE_SESSION`     | `{ name?: string }`     | `Session`                      | Write to IndexedDB, push undo      |
| `RESTORE_SESSION`  | `{ sessionId: string }` | `{ tabsOpened: number }`       | Open tabs via `chrome.tabs.create` |
| `DELETE_SESSION`   | `{ sessionId: string }` | `{ success: true }`            | Delete from IndexedDB, push undo   |
| `TRIGGER_AI_GROUP` | —                       | `GroupingResult`               | None (preview only)                |
| `APPLY_GROUPING`   | `GroupingResult`        | `Session`                      | Write to IndexedDB, push undo      |
| `UNDO`             | —                       | `{ undone: UndoEntry }`        | Revert last action                 |
| `GET_SETTINGS`     | —                       | `Settings`                     | None                               |
| `UPDATE_SETTINGS`  | `Settings`              | `{ success: true }`            | Write to chrome.storage.local      |
| `EXPORT_DATA`      | —                       | `string` (JSON)                | None                               |
| `IMPORT_DATA`      | `string` (JSON)         | `{ sessionsImported: number }` | Clear + write IndexedDB, push undo |
| `GET_TIER`         | —                       | `"free" \| "pro"`              | None                               |

### 5.3 Messaging Pattern: Command-Based

All messages are **commands** (request/response). There are no event-based broadcasts from background to popup.

**Rationale:**

- Popup lifecycle is short; it cannot maintain long-lived subscriptions.
- Polling is unnecessary; popup fetches fresh data on mount.
- Simpler mental model: popup asks, background answers.

**If real-time updates are ever needed (not in MVP):**

- Use `chrome.storage.onChanged` listener in popup.
- Background writes a "version" key to `chrome.storage.local` on data change.
- Popup reacts by re-fetching.

---

## 6. IndexedDB Usage

### 6.1 Database Schema

```typescript
// storage/db.ts

const DB_NAME = "tabflow";
const DB_VERSION = 1;

interface DBSchema {
  sessions: {
    key: string; // Session ID (UUID)
    value: Session;
    indexes: {
      byCreatedAt: Date;
    };
  };
  undoStack: {
    key: number; // Auto-increment
    value: UndoEntry;
  };
  backups: {
    key: string; // Timestamp ISO string
    value: BackupBlob;
  };
}
```

### 6.2 Object Stores

| Store       | Key            | Indexes     | Purpose                                       |
| ----------- | -------------- | ----------- | --------------------------------------------- |
| `sessions`  | `id` (UUID)    | `createdAt` | Session objects with embedded groups and tabs |
| `undoStack` | auto-increment | —           | LIFO stack of undo entries                    |
| `backups`   | ISO timestamp  | —           | Full data snapshots                           |

### 6.3 Access Patterns

**Read all sessions (sorted by date):**

```typescript
// storage/sessions.ts
async function getAllSessions(): Promise<Session[]> {
  const db = await openDB();
  const tx = db.transaction("sessions", "readonly");
  const index = tx.store.index("byCreatedAt");
  return index.getAll(); // Returns sorted by createdAt
}
```

**Write session:**

```typescript
async function saveSession(session: Session): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("sessions", "readwrite");
  await tx.store.put(session);
  await tx.done;
}
```

**Delete session:**

```typescript
async function deleteSession(id: string): Promise<Session | undefined> {
  const db = await openDB();
  const tx = db.transaction("sessions", "readwrite");
  const existing = await tx.store.get(id);
  if (existing) await tx.store.delete(id);
  await tx.done;
  return existing; // Return for undo
}
```

### 6.4 Transaction Boundaries

| Operation      | Transaction Scope                  | Stores Involved            |
| -------------- | ---------------------------------- | -------------------------- |
| Save session   | Single tx                          | `sessions`                 |
| Delete session | Single tx                          | `sessions`                 |
| Apply grouping | Single tx                          | `sessions`                 |
| Push undo      | Single tx                          | `undoStack`                |
| Execute undo   | Two tx (read undo, write sessions) | `undoStack`, `sessions`    |
| Create backup  | Single tx                          | `backups`                  |
| Import data    | Single tx                          | `sessions` (clear + write) |

**Rule:** Keep transactions short. Do not hold a transaction open while awaiting network requests.

### 6.5 Failure Handling

| Failure                | Handling                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| DB open fails          | Log error; disable save/restore; show error in popup             |
| Transaction aborts     | Catch in caller; surface error to UI; do not retry automatically |
| Quota exceeded         | Warn user; suggest export; do not auto-delete                    |
| Schema migration fails | Fail loudly; block extension until manually resolved             |

**Error Propagation:**

```typescript
try {
  await saveSession(session);
} catch (err) {
  if (err.name === "QuotaExceededError") {
    throw new Error("Storage full. Export your data and clear old sessions.");
  }
  throw new Error("Failed to save session. Please try again.");
}
```

---

## 7. Undo & Backup Mechanism

### 7.1 Undo Stack Design

```typescript
// shared/types.ts

type UndoEntryType =
  | "SAVE_SESSION"
  | "DELETE_SESSION"
  | "APPLY_GROUPING"
  | "IMPORT";

interface UndoEntry {
  type: UndoEntryType;
  timestamp: number;
  data: unknown; // Type depends on UndoEntryType
}

// Specific payloads
interface SaveSessionUndo {
  type: "SAVE_SESSION";
  sessionId: string;
}

interface DeleteSessionUndo {
  type: "DELETE_SESSION";
  session: Session; // Full session for restoration
}

interface ApplyGroupingUndo {
  type: "APPLY_GROUPING";
  previousSession: Session;
}

interface ImportUndo {
  type: "IMPORT";
  previousSessions: Session[];
}
```

### 7.2 Undo Stack Storage

**In-memory during active use:**

```typescript
// background/undo.ts
let undoStack: UndoEntry[] = [];
const MAX_UNDO_DEPTH = 10;
```

**Persistence triggers:**

1. After every `push()` — debounced 500ms write to IndexedDB
2. On service worker idle termination (best-effort via `beforeunload` equivalent)

**Rehydration on wake-up:**

```typescript
// background/index.ts
async function init() {
  undoStack = await loadUndoStack(); // From IndexedDB
}
```

### 7.3 Undo Execution

```typescript
// background/undo.ts

async function executeUndo(): Promise<UndoEntry | null> {
  if (undoStack.length === 0) return null;

  const entry = undoStack.pop();
  await persistUndoStack(); // Save updated stack

  switch (entry.type) {
    case "SAVE_SESSION":
      await deleteSession(entry.sessionId);
      break;
    case "DELETE_SESSION":
      await saveSession(entry.session);
      break;
    case "APPLY_GROUPING":
      await saveSession(entry.previousSession); // Overwrite
      break;
    case "IMPORT":
      await clearAllSessions();
      for (const session of entry.previousSessions) {
        await saveSession(session);
      }
      break;
  }

  return entry;
}
```

### 7.4 Backup Mechanism

**Hourly auto-backup:**

```typescript
// background/alarms.ts

chrome.alarms.create("hourlyBackup", { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "hourlyBackup") {
    await createBackup();
  }
});
```

**Backup creation:**

```typescript
// storage/backups.ts

async function createBackup(): Promise<void> {
  const sessions = await getAllSessions();
  const backup: BackupBlob = {
    version: 1,
    timestamp: new Date().toISOString(),
    sessions,
  };

  const db = await openDB();
  const tx = db.transaction("backups", "readwrite");
  await tx.store.put(backup, backup.timestamp);

  // Prune old backups (keep last 24)
  const allKeys = await tx.store.getAllKeys();
  if (allKeys.length > 24) {
    const toDelete = allKeys.slice(0, allKeys.length - 24);
    for (const key of toDelete) {
      await tx.store.delete(key);
    }
  }

  await tx.done;

  // Update pointer in chrome.storage.local
  await chrome.storage.local.set({ backupPointer: backup.timestamp });
}
```

**Manual export (JSON download):**

```typescript
// Called from EXPORT_DATA handler
async function exportData(): Promise<string> {
  const sessions = await getAllSessions();
  const settings = await getSettings();
  return JSON.stringify({ version: 1, sessions, settings }, null, 2);
}
```

**Manual import (with validation):**

```typescript
// Called from IMPORT_DATA handler
async function importData(json: string): Promise<number> {
  const data = JSON.parse(json);

  // Validate schema
  if (!validateImportSchema(data)) {
    throw new Error("Invalid import file format");
  }

  // Store previous state for undo
  const previousSessions = await getAllSessions();
  pushUndo({ type: "IMPORT", previousSessions });

  // Clear and write
  await clearAllSessions();
  for (const session of data.sessions) {
    await saveSession(session);
  }

  return data.sessions.length;
}
```

---

## 8. Hard Architectural Boundaries

### 8.1 What the Popup MUST NOT Do

| Forbidden Action                     | Reason                                                |
| ------------------------------------ | ----------------------------------------------------- |
| Call `chrome.tabs.*`                 | Background owns all tab interactions                  |
| Call `chrome.storage.*` directly     | Must go through message passing                       |
| Access IndexedDB directly            | Background owns data layer                            |
| Make network requests                | AI calls go through background                        |
| Hold persistent state                | Popup is ephemeral; state lives in background/storage |
| Modify sessions without confirmation | User must confirm destructive actions                 |
| Apply AI groupings without preview   | User must see and approve                             |

### 8.2 What the Background MUST Own

| Responsibility                | Location                                    |
| ----------------------------- | ------------------------------------------- |
| All `chrome.tabs` API calls   | `background/tabCapture.ts`                  |
| All `chrome.alarms` API calls | `background/alarms.ts`                      |
| All IndexedDB reads/writes    | `background/` → `storage/`                  |
| All AI/Azure Function calls   | `background/grouping.ts` → `ai/aiClient.ts` |
| Undo stack management         | `background/undo.ts`                        |
| Settings persistence          | `background/` via handlers                  |
| Tier enforcement              | `background/` checks tier before AI calls   |

### 8.3 What Logic is Shared vs Isolated

| Module                 | Shared? | Notes                            |
| ---------------------- | ------- | -------------------------------- |
| `shared/types.ts`      | ✅ Yes  | All contexts import types        |
| `shared/constants.ts`  | ✅ Yes  | Limits, config values            |
| `shared/messages.ts`   | ✅ Yes  | Action constants, message shapes |
| `shared/validators.ts` | ✅ Yes  | Schema validation for import     |
| `storage/*`            | ❌ No   | Only background imports          |
| `ai/*`                 | ❌ No   | Only background imports          |
| `popup/hooks/*`        | ❌ No   | Popup-specific                   |
| `options/components/*` | ❌ No   | Options-specific                 |

### 8.4 Enforcement Checklist

Before merging any PR, verify:

- [ ] Popup/Options do not import from `background/`, `storage/`, or `ai/`
- [ ] No `chrome.tabs`, `chrome.storage`, `chrome.alarms` calls outside `background/`
- [ ] All new message types are added to `shared/messages.ts`
- [ ] All IndexedDB access goes through `storage/` modules
- [ ] Undo entry is pushed for every user-facing mutation
- [ ] AI groupings are not written until user confirms
- [ ] Free tier users cannot trigger `TRIGGER_AI_GROUP`

---

## Summary

This implementation plan defines:

1. **Clear ownership**: Background owns Chrome APIs and storage; popup/options are stateless UIs.
2. **Typed contracts**: All communication uses defined message shapes.
3. **Defensive storage**: Transactions are scoped; failures are surfaced; undo is always available.
4. **Performance**: Popup mounts fast; no heavy dependencies; skeleton-first rendering.
5. **Trust**: No auto-destructive actions; user confirms before AI applies; data is exportable.

Engineers should treat this document as the source of truth for implementation decisions.
