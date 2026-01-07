# TabFlow

A local-first, reliability-focused tab manager for Chrome with optional AI-powered grouping.

## Architecture

TabFlow is a monorepo containing:

| Package | Description |
|---------|-------------|
| `apps/extension` | Chrome Extension (Manifest V3) |
| `apps/api` | Azure Functions backend |
| `docs/` | Architecture and implementation documentation |

## Tech Stack

### Chrome Extension
- TypeScript
- React 18
- Tailwind CSS
- Vite + CRXJS
- IndexedDB (primary storage)
- chrome.storage.local (settings)

### API
- Azure Functions v4 (Node.js)
- TypeScript
- Google Auth Library

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Azure Functions Core Tools v4 (for API development)

### Install Dependencies

```bash
# Install all packages
npm run install:all

# Or individually:
npm install --prefix apps/extension
npm install --prefix apps/api
```

### Development

#### Chrome Extension

```bash
# Build extension
npm run extension:build

# Or run in dev mode with hot reload
npm run extension:dev
```

Load the extension in Chrome:
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `apps/extension/dist/`

#### API

```bash
# Build API
npm run api:build

# Start local Azure Functions host
npm run api:start
```

API available at `http://localhost:7071`

### Build All

```bash
npm run build:all
```

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
│   │   ├── dist/           # Build output
│   │   └── package.json
│   │
│   └── api/                # Azure Functions
│       ├── src/
│       │   ├── functions/  # HTTP endpoints
│       │   └── lib/        # Shared utilities
│       └── package.json
│
├── docs/                   # Documentation
│   ├── architecture/
│   ├── implementation/
│   └── roadmap/
│
├── package.json            # Root package (scripts only)
└── README.md
```

## Documentation

See the `docs/` folder for detailed documentation:

- [Architecture Overview](docs/architecture/overview.md)
- [Chrome Extension Architecture](docs/architecture/chrome-extension.md)
- [Azure Function Architecture](docs/architecture/azure-function.md)
- [Implementation Plan](docs/implementation/chrome-extension-plan.md)
- [Roadmap](docs/roadmap/phases.md)

## Current Status

### Phase 1 (MVP) - ✅ Complete
- [x] Local tab session management
- [x] Save/restore sessions
- [x] Search tabs
- [x] Undo system
- [x] Session rename
- [x] Copy links
- [x] Export/import data
- [x] Auto-backup

### Phase 2 (Auth) - 🚧 In Progress
- [x] Monorepo structure
- [x] Azure Functions scaffold
- [x] Google authentication endpoint
- [ ] Extension auth integration
- [ ] Cloud sync infrastructure

### Phase 3 (AI & Sync) - Planned
- [ ] AI-powered tab grouping
- [ ] Cloud sync
- [ ] Pro tier features

## License

MIT

