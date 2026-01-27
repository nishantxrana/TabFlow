# TabFlow

> Local‑first tab session manager for Chrome with optional end‑to‑end encrypted cloud sync.

[![Build Extension](https://github.com/nishantxrana/TabFlow/actions/workflows/build-extension.yml/badge.svg)](https://github.com/nishantxrana/TabFlow/actions/workflows/build-extension.yml)
[![Deploy API](https://github.com/nishantxrana/TabFlow/actions/workflows/deploy-api.yml/badge.svg)](https://github.com/nishantxrana/TabFlow/actions/workflows/deploy-api.yml)
[![Validate Code](https://github.com/nishantxrana/TabFlow/actions/workflows/validate.yml/badge.svg)](https://github.com/nishantxrana/TabFlow/actions/workflows/validate.yml)

---

## Overview

TabFlow is a privacy‑focused Chrome extension that lets you save groups of open tabs as **named sessions** and restore them later with one click.

It is built on three principles:

* **Local‑first** – your data stays on your device by default
* **User‑controlled sync** – optional, manual cloud sync
* **End‑to‑end encryption** – the server never sees plaintext

---

## Features

### Core

* Save open tabs as named sessions
* Restore sessions instantly
* Rename and delete sessions
* Full‑text search across all saved tabs
* Copy all links from a session
* Undo recent actions

### Backup & Sync

* Export/import sessions as JSON
* Automatic local backups via `chrome.alarms`
* Optional manual cloud sync (encrypted)
* Preview cloud data before restoring

### Privacy

* No analytics
* No tracking
* No ads
* No background sync

---

## What TabFlow Is Not

* ❌ Bookmark manager
* ❌ Automatic background sync tool
* ❌ Cross‑browser extension (Chrome only)
* ❌ Collaboration or team product

---

## Screenshots

> *Add screenshots or GIFs here to showcase the popup UI, session list, and restore flow.*

---

## Architecture

TabFlow is a monorepo with two packages:

| Package          | Description                                |
| ---------------- | ------------------------------------------ |
| `apps/extension` | Chrome extension (Manifest V3)             |
| `apps/api`       | Azure Functions backend for encrypted sync |

```
tabflow/
├── apps/
│   ├── extension/
│   └── api/
├── docs/
├── .github/workflows/
└── package.json
```

---

## Tech Stack

### Extension

* TypeScript
* React 18
* Tailwind CSS
* Vite + CRXJS
* IndexedDB (sessions)
* `chrome.storage.local` (settings)

### Backend

* Azure Functions v4 (Node.js 18+)
* TypeScript
* Azure Blob Storage (encrypted blobs only)

---

## Security Model

| Principle              | Implementation                         |
| ---------------------- | -------------------------------------- |
| Local‑first            | All sessions stored locally by default |
| Manual sync            | User‑initiated only                    |
| Client‑side encryption | AES‑256‑GCM                            |
| Zero knowledge server  | Server stores only encrypted blobs     |
| No analytics           | No telemetry or tracking               |

### Encryption Details

* Algorithm: **AES‑256‑GCM**
* Key derivation: **PBKDF2 (100,000 iterations)**
* Encryption happens **inside the extension**

See [`privacy.md`](privacy.md) for full policy.

---

## Quick Start

### Prerequisites

* Node.js 18+ (22 recommended)
* npm 9+

---

### Install

```bash
git clone https://github.com/nishantxrana/TabFlow.git
cd TabFlow
npm run install:all
```

---

## Development

### Extension

```bash
cd apps/extension
cp .env.example .env.development
npm run extension:dev
```

Build production bundle:

```bash
npm run extension:build
```

Load into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select `apps/extension/dist`

---

### Backend (Optional – for cloud sync)

#### Prerequisites

* Azure Functions Core Tools v4
* Azurite

```bash
cd apps/api
cp local.settings.json.example local.settings.json
npm run api:build
npm run api:start
```

API runs at: `http://localhost:7071`

---

## Environment Variables

### Extension (build‑time)

| Variable              | Description    |
| --------------------- | -------------- |
| `VITE_CLOUD_API_URL`  | API base URL   |
| `VITE_ENCRYPTION_KEY` | Encryption key |

Generate key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### API (runtime)

| Variable                    | Description     |
| --------------------------- | --------------- |
| `GOOGLE_CLIENT_ID`          | OAuth client ID |
| `STORAGE_CONNECTION_STRING` | Azure storage   |
| `BLOB_CONTAINER_NAME`       | Optional        |
| `DEV_MODE_ENABLED`          | Optional        |

---

## API Endpoints

| Method | Endpoint             | Description             |
| ------ | -------------------- | ----------------------- |
| POST   | `/api/auth/google`   | Verify token            |
| POST   | `/api/sync/upload`   | Upload encrypted data   |
| GET    | `/api/sync/download` | Download encrypted data |

---

## Available Commands

### Root

| Command               | Description      |
| --------------------- | ---------------- |
| `npm run install:all` | Install all deps |
| `npm run build:all`   | Build everything |
| `npm run format`      | Format code      |

### Extension

| Command         | Description      |
| --------------- | ---------------- |
| `npm run dev`   | Watch mode       |
| `npm run build` | Production build |
| `npm run lint`  | Lint             |

### API

| Command         | Description |
| --------------- | ----------- |
| `npm run build` | Compile     |
| `npm run start` | Start host  |

---

## CI / CD

GitHub Actions:

* `validate.yml` – PR validation
* `build-extension.yml` – extension build
* `deploy-api.yml` – Azure deploy

---

## Roadmap

* Magic‑link authentication
* AI‑powered tab grouping
* All browser support

---

## Contributing

Contributions are welcome.

```bash
git checkout -b feature/my-feature
npm run format && npm run build:all
git commit -m "feat: add feature"
git push origin feature/my-feature
```

Open a PR 🚀

---

## License

MIT – see [`LICENSE`](LICENSE)

---

## Author

**Nishant Rana**
GitHub: [@nishantxrana](https://github.com/nishantxrana)

---

## Support

If you find this project useful:

* ⭐ Star the repo
* 🐞 Report issues
* 💡 Suggest features

---
