# TabFlow – Chrome Extension Architecture

> Derived from: `tab_flow_full_architecture_roadmap_authoritative.md`

---

## Manifest V3 Architecture

TabFlow uses **Manifest V3** exclusively. This is non-negotiable.

Key implications:
- Background context is a **Service Worker**, not a persistent background page
- Service worker may be terminated at any time by Chrome; state must be persisted
- All network requests from the service worker are subject to standard CORS rules
- `chrome.storage` and IndexedDB are the only durable storage mechanisms

---

## Folder Structure

```
src/
├─ background/        # Service worker (core logic)
│  ├─ index.ts        # Entry point, event listeners
│  ├─ tabCapture.ts   # Tab metadata extraction
│  ├─ grouping.ts     # Rule-based + AI grouping orchestration
│  ├─ undo.ts         # Undo stack management
│  └─ messaging.ts    # Message handler dispatch
│
├─ popup/             # React popup UI
│  ├─ App.tsx         # Root component
│  ├─ components/     # UI components
│  └─ styles.css      # Tailwind imports
│
├─ options/           # React settings page
│  ├─ App.tsx         # Root component
│  └─ components/     # Settings components
│
├─ storage/           # IndexedDB abstraction
│  ├─ db.ts           # DB connection, migrations
│  ├─ sessions.ts     # Session CRUD
│  └─ backups.ts      # Backup logic
│
├─ ai/                # AI client
│  └─ aiClient.ts     # Azure Function caller
│
├─ shared/            # Types, constants, utils
│  ├─ types.ts        # Shared type definitions
│  └─ constants.ts    # Config values
│
├─ manifest.json
└─ index.html
```

---

## Background Service Worker

The service worker is the **authoritative layer** for all Chrome API interactions.

### Responsibilities

| Responsibility | Details |
|----------------|---------|
| Tab capture | Read `chrome.tabs` to extract title, URL, domain, favicon, lastAccessed |
| Storage orchestration | Read/write sessions and groups to IndexedDB |
| Undo stack | Maintain last 10 reversible actions in memory (persisted to IndexedDB on terminate) |
| Rule-based grouping | Group tabs by domain or manual rules |
| AI grouping trigger | Send tab metadata to Azure Function, receive group assignments |

### Constraints

- **Popup UI never touches Chrome APIs directly.** All tab/session operations go through the service worker.
- Service worker must handle wake-up gracefully; rehydrate undo stack from storage on init.
- No long-running timers; use `chrome.alarms` for scheduled tasks (e.g., hourly backup).

---

## Message Passing Model

Communication between popup/options and the service worker uses `chrome.runtime.sendMessage` with a typed action/payload pattern.

### Message Schema

```typescript
interface Message<T = unknown> {
  action: string;
  payload?: T;
}

interface Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Supported Actions (Examples)

| Action | Direction | Description |
|--------|-----------|-------------|
| `GET_SESSIONS` | Popup → SW | Fetch all saved sessions |
| `SAVE_SESSION` | Popup → SW | Save current tabs as a new session |
| `RESTORE_SESSION` | Popup → SW | Restore a session (open tabs) |
| `DELETE_SESSION` | Popup → SW | Delete a session |
| `TRIGGER_AI_GROUP` | Popup → SW | Initiate AI grouping request |
| `APPLY_GROUPING` | Popup → SW | Apply previewed grouping |
| `UNDO` | Popup → SW | Revert last action |
| `GET_SETTINGS` | Options → SW | Fetch user settings |
| `UPDATE_SETTINGS` | Options → SW | Update user settings |

### Implementation Pattern

**background/messaging.ts**
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse({ success: true, data: result }))
    .catch((err) => sendResponse({ success: false, error: err.message }));
  return true; // async response
});
```

---

## React Popup & Options Separation

| Surface | Purpose | Mount Target |
|---------|---------|--------------|
| **Popup** | Primary user interface; session/group management, search, AI trigger | `popup.html` |
| **Options** | Settings, backup config, tier management, export/import | `options.html` |

### Popup UI Constraints

- **Mount time < 50ms.** No lazy loading on critical path.
- No heavy libraries. React + Tailwind only.
- Immediate state: fetch sessions via message on mount; show skeleton or cached data.

### Options Page Constraints

- Can afford slightly longer load times than popup.
- Must validate all imports before writing to storage.

---

## Storage Strategy

### IndexedDB (Primary)

Used for all core data that must survive extension restarts and browser updates.

| Store | Data |
|-------|------|
| `sessions` | Session objects (id, createdAt, groups[]) |
| `groups` | Group objects (id, name, tabs[]) |
| `tabSnapshots` | TabSnapshot objects (title, url, domain, favicon, lastAccessed) |
| `undoStack` | Serialized undo entries (last 10) |
| `backups` | Timestamped backup blobs |

### chrome.storage.local (Secondary)

Used for lightweight settings and flags that need to be read quickly.

| Key | Data |
|-----|------|
| `settings` | User preferences (backup frequency, AI opt-in, etc.) |
| `tier` | `"free"` or `"pro"` |
| `backupPointer` | ID of latest backup in IndexedDB |
| `lastSync` | Timestamp of last cloud sync (future) |

### Why Two Storage Mechanisms?

- **IndexedDB** supports large data, complex queries, and transactions.
- **chrome.storage.local** is faster for small key-value reads (settings) and is accessible from both service worker and content scripts.

---

## Backup Strategy

| Mechanism | Frequency | Storage |
|-----------|-----------|---------|
| Auto-backup | Hourly | IndexedDB (`backups` store) |
| Manual export | On demand | JSON file (user's filesystem) |
| Import | On demand | Validated JSON → IndexedDB |

### Undo Stack

- Stored in memory during service worker lifecycle.
- Persisted to IndexedDB on service worker termination (`beforeunload` or idle timeout).
- Rehydrated on service worker wake-up.
- Depth: **last 10 actions**.

---

## Security Considerations

- Extension requests only go to the registered Azure Function endpoint.
- No content scripts; extension does not inject code into pages.
- No cross-origin requests from popup or options pages.
- All AI-related secrets (API keys) are stored only on the Azure Function, never in the extension.

---

## Related Documents

- [System Overview](./overview.md)
- [Azure Function Architecture](./azure-function.md)
- [AI Grouping Architecture](./ai-grouping.md)

