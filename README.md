# TabFlow

A local-first tab session manager for Chrome with optional encrypted cloud sync.

---

## What TabFlow Is

TabFlow is a Chrome extension (Manifest V3) that lets you save groups of open tabs as named sessions and restore them later. It prioritizes local storage and user control.

**What TabFlow is not:**

- Not a bookmark manager
- Not an automatic background sync tool
- Not a cross-browser extension (Chrome only, currently)
- Not a team/collaboration tool

---

## Current Features

These features are implemented and available today:

- **Save sessions** — Capture open tabs as a named session
- **Restore sessions** — Reopen all tabs from a saved session
- **Rename sessions** — Edit session names after creation
- **Search tabs** — Find tabs across all sessions
- **Undo system** — Revert recent actions
- **Copy links** — Copy all URLs from a session
- **Export/import** — Backup and restore data as JSON
- **Auto-backup** — Periodic local backups via `chrome.alarms`
- **Cloud sync (optional)** — Manual, encrypted sync to the cloud
- **Restore preview** — Preview cloud data before overwriting local sessions

---

## Architecture

TabFlow is a monorepo with two packages:

| Package          | Description                            |
| ---------------- | -------------------------------------- |
| `apps/extension` | Chrome Extension (Manifest V3)         |
| `apps/api`       | Azure Functions backend for cloud sync |

### Extension

- **Language:** TypeScript
- **UI:** React 18 + Tailwind CSS
- **Build:** Vite + CRXJS
- **Storage:** IndexedDB (sessions), chrome.storage.local (settings)

### Backend

- **Runtime:** Azure Functions v4 (Node.js 18)
- **Language:** TypeScript
- **Storage:** Azure Blob Storage (encrypted blobs only)

---

## Security and Privacy

TabFlow is designed with privacy as a core principle:

| Principle              | Implementation                                   |
| ---------------------- | ------------------------------------------------ |
| Local-first            | All data stored locally by default               |
| No background sync     | Cloud sync is manual and user-initiated          |
| Client-side encryption | Data encrypted before leaving the device         |
| No analytics           | No telemetry, tracking, or usage data collection |
| No ads                 | No advertising of any kind                       |
| No data selling        | User data is never sold or shared                |
| No remote code         | All code bundled in extension package            |

See [privacy.md](privacy.md) for the full privacy policy.

---

## Authentication

Cloud sync uses Google authentication via Chrome's `chrome.identity` API.

- Works only in Chrome (not Chromium-based browsers without Google integration)
- Tokens are short-lived and not stored persistently
- Email is used only to associate cloud data with the user

**Future:** Magic link authentication for non-Chrome browsers is planned but not yet implemented.

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Azure Functions Core Tools v4 (for backend development)

### Install

```bash
npm run install:all
```

### Extension

```bash
# Development with hot reload
npm run extension:dev

# Production build
npm run extension:build
```

Load in Chrome:

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `apps/extension/dist/`

### Backend

```bash
# Build
npm run api:build

# Start local server
npm run api:start
```

Local API runs at `http://localhost:7071`

---

## Project Structure

```
tabflow/
├── apps/
│   ├── extension/          # Chrome Extension
│   │   ├── src/
│   │   │   ├── background/ # Service worker
│   │   │   ├── popup/      # Popup UI (React)
│   │   │   ├── options/    # Options page (React)
│   │   │   ├── storage/    # IndexedDB layer
│   │   │   └── shared/     # Types, constants
│   │   └── dist/           # Build output
│   │
│   └── api/                # Azure Functions
│       ├── src/
│       │   ├── functions/  # HTTP endpoints
│       │   └── lib/        # Shared utilities
│       └── package.json
│
├── docs/                   # Documentation
├── privacy.md              # Privacy policy
└── README.md
```

---

## Project Status

| Milestone                      | Status         |
| ------------------------------ | -------------- |
| Local session management       | ✅ Complete    |
| Cloud sync (manual, encrypted) | ✅ Complete    |
| Google authentication          | ✅ Complete    |
| Chrome Web Store               | Unlisted (MVP) |

### Planned (Not Yet Implemented)

- Magic link authentication for non-Chrome browsers
- AI-powered tab grouping
- Monetization / Pro tier

---

## License

MIT
