# TabFlow – Complete Architecture & Technical Documentation

> This document provides a comprehensive technical overview of TabFlow for AI assistants and developers.
> It covers all aspects of the project: architecture, data flow, security, APIs, and implementation details.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Extension Architecture](#extension-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Data Models](#data-models)
6. [Message Passing System](#message-passing-system)
7. [Storage Layer](#storage-layer)
8. [Cloud Sync Flow](#cloud-sync-flow)
9. [Encryption System](#encryption-system)
10. [Authentication Flow](#authentication-flow)
11. [File Structure](#file-structure)
12. [Configuration & Constants](#configuration--constants)
13. [Build & Deployment](#build--deployment)
14. [Security Model](#security-model)

---

## Project Overview

**TabFlow** is a Chrome extension (Manifest V3) that saves browser tabs as named sessions for later restoration. It follows a **local-first** architecture with optional encrypted cloud sync.

### Core Capabilities

| Feature              | Description                                     |
| -------------------- | ----------------------------------------------- |
| **Save Sessions**    | Capture all open tabs as a named session        |
| **Restore Sessions** | Reopen all tabs from a saved session            |
| **Search**           | Find tabs across all saved sessions             |
| **Undo System**      | Revert save, delete, rename, and import actions |
| **Export/Import**    | Backup and restore data as JSON                 |
| **Cloud Sync**       | Manual, encrypted sync to Azure (optional)      |
| **Auto-Backup**      | Periodic local backups via Chrome alarms        |

### Tech Stack

| Component          | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| **Extension**      | TypeScript, React 18, Tailwind CSS, Vite, CRXJS       |
| **Local Storage**  | IndexedDB (sessions), chrome.storage.local (settings) |
| **Backend**        | Azure Functions v4, Node.js 22, TypeScript            |
| **Cloud Storage**  | Azure Blob Storage                                    |
| **Authentication** | Google OAuth via chrome.identity API                  |
| **Encryption**     | AES-256-GCM, PBKDF2 key derivation                    |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CHROME BROWSER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │   Popup UI      │    │   Options UI    │    │   Background Service    │  │
│  │   (React)       │    │   (React)       │    │   Worker (Manifest V3)  │  │
│  │                 │    │                 │    │                         │  │
│  │  - Session list │    │  - Settings     │    │  - Message router       │  │
│  │  - Save/Restore │    │  - Export/Import│    │  - Tab capture          │  │
│  │  - Search       │    │  - Cloud sync   │    │  - Storage operations   │  │
│  │  - Undo         │    │  - Clear data   │    │  - Cloud sync handler   │  │
│  └────────┬────────┘    └────────┬────────┘    │  - Undo management      │  │
│           │                      │             │  - Backup alarms        │  │
│           │    chrome.runtime    │             └───────────┬─────────────┘  │
│           │    .sendMessage()    │                         │                │
│           └──────────────────────┴─────────────────────────┘                │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                             IndexedDB                               │    │
│  │       ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │    │
│  │       │   sessions   │  │  undoStack   │  │   backups    │          │    │
│  │       │   (Session)  │  │ (UndoEntry)  │  │ (BackupBlob) │          │    │
│  │       └──────────────┘  └──────────────┘  └──────────────┘          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    chrome.storage.local                             │    │
│  │                    { settings: Settings }                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS (encrypted payload)
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AZURE FUNCTIONS API                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│        ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│        │ POST /auth/     │  │ POST /sync/     │  │ GET /sync/      │        │
│        │     google      │  │     upload      │  │    download     │        │
│        │                 │  │                 │  │                 │        │
│        │ Verify token    │  │ Store encrypted │  │ Retrieve blob   │        │
│        │ Return userId   │  │ blob            │  │                 │        │
│        └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │
│                 │                    │                    │                 │
│                 └────────────────────┼────────────────────┘                 │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Azure Blob Storage                          │    │
│  │          tabflow-sync/users/{userId}/sessions.enc.json              │    │
│  │                (encrypted, opaque to server)                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Extension Architecture

### Service Worker Lifecycle (Manifest V3)

The background service worker is **ephemeral** – Chrome terminates it after ~30 seconds of inactivity.

```
Extension Start
      │
      ▼
┌─────────────────┐
│   initialize()  │  ← Called on every wake-up
│   - getDB()     │
│   - initUndo()  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Event Listeners Registered             │
├─────────────────────────────────────────────────────┤
│ chrome.runtime.onInstalled → Setup on first install │
│ chrome.runtime.onMessage   → Message router         │
│ chrome.alarms.onAlarm      → Hourly backup trigger  │
└─────────────────────────────────────────────────────┘
         │
         ▼
   (Wait for events)
         │
         ▼
   (30s inactivity)
         │
         ▼
┌─────────────────┐
│ Service Worker  │
│   Terminates    │
└─────────────────┘
```

### Module Responsibilities

| Module             | File                       | Purpose                                                    |
| ------------------ | -------------------------- | ---------------------------------------------------------- |
| **Entry Point**    | `background/index.ts`      | Initialization, event listener registration                |
| **Message Router** | `background/messaging.ts`  | Routes all popup/options messages to handlers              |
| **Tab Capture**    | `background/tabCapture.ts` | Chrome tabs API interactions (ONLY module that touches it) |
| **Undo Manager**   | `background/undo.ts`       | In-memory undo stack with IndexedDB persistence            |
| **Alarms**         | `background/alarms.ts`     | Hourly backup scheduler                                    |
| **Cloud Sync**     | `background/cloudSync.ts`  | Orchestrates upload/download with encryption               |
| **Cloud API**      | `background/cloudApi.ts`   | HTTP client for Azure Functions                            |
| **Encryption**     | `background/encryption.ts` | AES-256-GCM encrypt/decrypt                                |
| **Auth**           | `background/auth.ts`       | Google OAuth via chrome.identity                           |

---

## Backend Architecture

### Azure Functions (v4 Programming Model)

```
apps/api/src/
├── index.ts                    # Registers all functions
├── functions/
│   ├── authGoogle.ts           # POST /auth/google
│   ├── syncUpload.ts           # POST /sync/upload
│   └── syncDownload.ts         # GET /sync/download
└── lib/
    ├── auth/
    │   ├── googleAuth.ts       # Token verification via Google tokeninfo
    │   └── index.ts
    ├── storage/
    │   ├── blobStorage.ts      # Azure Blob operations
    │   └── index.ts
    ├── cors/
    │   ├── cors.ts             # CORS handling for Chrome extension
    │   └── index.ts
    └── validation/
        ├── constants.ts        # Validation constants
        ├── sessionValidation.ts
        └── index.ts
```

### API Endpoints

| Method | Endpoint         | Purpose                                   | Auth         |
| ------ | ---------------- | ----------------------------------------- | ------------ |
| `POST` | `/auth/google`   | Verify Google token, return stable userId | Bearer token |
| `POST` | `/sync/upload`   | Store encrypted payload                   | Bearer token |
| `GET`  | `/sync/download` | Retrieve encrypted payload                | Bearer token |

### User ID Generation

Server generates a **stable, privacy-safe userId** from Google's subject:

```typescript
// googleAuth.ts
function generateUserId(sub: string): string {
  const input = `google:${sub}`;
  return createHash("sha256").update(input).digest("hex");
}
```

This ensures:

- Same user always gets same userId
- Google's internal ID is not exposed
- Predictable 64-character hex string

---

## Data Models

### TabSnapshot

```typescript
interface TabSnapshot {
  title: string; // Tab title
  url: string; // Full URL
  domain: string; // Extracted domain (e.g., "github.com")
  favicon: string; // Favicon URL
  lastAccessed: number; // Timestamp
}
```

### Group

```typescript
interface Group {
  id: string; // UUID
  name: string; // Group name (default: "Tabs")
  tabs: TabSnapshot[];
}
```

### Session

```typescript
interface Session {
  id: string; // UUID
  name: string; // User-provided name
  createdAt: number; // Unix timestamp
  groups: Group[]; // Currently always 1 group (AI grouping is Phase 2)
}
```

### UndoEntry

```typescript
type UndoEntryType =
  | "SAVE_SESSION"
  | "DELETE_SESSION"
  | "RENAME_SESSION"
  | "APPLY_GROUPING"
  | "IMPORT";

interface UndoEntry {
  type: UndoEntryType;
  timestamp: number;
  data: unknown; // Type-specific payload
}

// Type-specific examples:
interface SaveSessionUndo {
  type: "SAVE_SESSION";
  data: { sessionId: string };
}

interface DeleteSessionUndo {
  type: "DELETE_SESSION";
  data: { session: Session }; // Full session for restoration
}

interface RenameSessionUndo {
  type: "RENAME_SESSION";
  data: { sessionId: string; oldName: string; newName: string };
}

interface ImportUndo {
  type: "IMPORT";
  data: { previousSessions: Session[] };
}
```

### BackupBlob

```typescript
interface BackupBlob {
  version: number; // Schema version (currently 1)
  timestamp: string; // ISO date string
  sessions: Session[];
  settings?: Settings;
}
```

### Settings

```typescript
interface Settings {
  autoBackup: boolean; // Enable hourly backups
  backupFrequencyHours: number; // Backup interval
  aiOptIn: boolean; // AI grouping opt-in (Phase 2)
}

const DEFAULT_SETTINGS: Settings = {
  autoBackup: true,
  backupFrequencyHours: 1,
  aiOptIn: false,
};
```

---

## Message Passing System

Popup and Options pages communicate with background via `chrome.runtime.sendMessage()`.

### Message Actions

```typescript
const MessageAction = {
  // Session management
  GET_SESSIONS: "GET_SESSIONS",
  SAVE_SESSION: "SAVE_SESSION",
  RESTORE_SESSION: "RESTORE_SESSION",
  DELETE_SESSION: "DELETE_SESSION",
  RENAME_SESSION: "RENAME_SESSION",

  // Undo
  UNDO: "UNDO",
  GET_UNDO_STACK: "GET_UNDO_STACK",

  // Settings
  GET_SETTINGS: "GET_SETTINGS",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",

  // Backup
  EXPORT_DATA: "EXPORT_DATA",
  IMPORT_DATA: "IMPORT_DATA",
  CLEAR_DATA: "CLEAR_DATA",

  // Tier
  GET_TIER: "GET_TIER",

  // Cloud Sync
  CLOUD_UPLOAD: "CLOUD_UPLOAD",
  CLOUD_DOWNLOAD_PREVIEW: "CLOUD_DOWNLOAD_PREVIEW",
  CLOUD_APPLY_RESTORE: "CLOUD_APPLY_RESTORE",

  // AI (Phase 2)
  TRIGGER_AI_GROUP: "TRIGGER_AI_GROUP",
  APPLY_GROUPING: "APPLY_GROUPING",
} as const;
```

### Message Flow Example (Save Session)

```
┌──────────────┐         ┌──────────────────────┐         ┌─────────────┐
│  Popup UI    │         │ Background Service   │         │  IndexedDB  │
│  (React)     │         │     Worker           │         │             │
└──────┬───────┘         └──────────┬───────────┘         └──────┬──────┘
       │                            │                            │
       │  sendMessage({             │                            │
       │    action: "SAVE_SESSION", │                            │
       │    payload: { name: "..." }│                            │
       │  })                        │                            │
       │ ─────────────────────────► │                            │
       │                            │                            │
       │                            │  getCurrentWindowTabs()    │
       │                            │ ◄────────────────────────► │
       │                            │                            │
       │                            │  createSession()           │
       │                            │ ─────────────────────────► │
       │                            │                            │
       │                            │  pushSaveSessionUndo()     │
       │                            │ ─────────────────────────► │
       │                            │                            │
       │  { success: true,          │                            │
       │    data: Session }         │                            │
       │ ◄───────────────────────── │                            │
       │                            │                            │
```

---

## Storage Layer

### IndexedDB Schema

```typescript
interface TabFlowDBSchema extends DBSchema {
  sessions: {
    key: string; // Session ID
    value: Session;
    indexes: {
      byCreatedAt: number; // For sorting
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

### Storage Operations (sessions.ts)

| Function                     | Description                           |
| ---------------------------- | ------------------------------------- |
| `getAllSessions()`           | Get all sessions, sorted newest first |
| `getSession(id)`             | Get single session by ID              |
| `sessionExists(id)`          | Check if session exists               |
| `createSession(name, tabs)`  | Create new session with tabs          |
| `updateSession(id, updates)` | Partial update                        |
| `deleteSession(id)`          | Delete and return deleted session     |
| `clearAllSessions()`         | Delete all sessions                   |

### chrome.storage.local

Used for lightweight settings (survives extension updates):

```typescript
// Settings
{
  settings: Settings;
}

// User tier
{
  tier: "free" | "pro";
}
```

---

## Cloud Sync Flow

### Upload Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Extension)                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Get all sessions from IndexedDB                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Create BackupBlob { version, timestamp, sessions }               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. JSON.stringify(backupBlob)                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. encryptData(json) → AES-256-GCM encrypted base64                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. POST /sync/upload { payload, schemaVersion, clientTimestamp }    │
│    Header: Authorization: Bearer <google_token>                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           SERVER (Azure Functions)                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. Verify Google token → derive userId (SHA-256 hash)               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. Store blob at: users/{userId}/sessions.enc.json                  │
│    (Server NEVER decrypts – payload is opaque)                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Download Flow (with Preview)

```
1. User clicks "Restore from Cloud"
          │
          ▼
2. CLOUD_DOWNLOAD_PREVIEW message
          │
          ▼
3. GET /sync/download → encrypted payload
          │
          ▼
4. decryptData() → BackupBlob
          │
          ▼
5. Show preview: "3 sessions, 25 tabs"
          │
          ▼
6. User confirms
          │
          ▼
7. CLOUD_APPLY_RESTORE message
          │
          ▼
8. clearAllSessions() + restoreFromBackup()
          │
          ▼
9. Push ImportUndo (so user can undo)
```

---

## Encryption System

### Algorithm

| Aspect             | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| **Algorithm**      | AES-256-GCM (authenticated encryption)                  |
| **Key Derivation** | PBKDF2-SHA256, 100,000 iterations                       |
| **Key Source**     | `VITE_ENCRYPTION_KEY` environment variable              |
| **IV**             | 12 bytes (96 bits), randomly generated per encryption   |
| **Output**         | Base64 encoded: `IV (12 bytes) + Ciphertext + Auth Tag` |

### Encryption Flow

```typescript
// encryption.ts

async function encryptData(plaintext: string): Promise<string> {
  // 1. Get derived key (cached after first derivation)
  const key = await getKey();

  // 2. Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt with AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  // 4. Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // 5. Base64 encode
  return btoa(String.fromCharCode(...combined));
}
```

### Key Derivation

```typescript
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("tabflow-v1"), // Static salt
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
```

---

## Authentication Flow

### Google OAuth via chrome.identity

```
┌────────────────────────────────────────────────────────────────────┐
│                        EXTENSION (Client)                           │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ chrome.identity.getAuthToken({ interactive: true })                │
│ - Opens Google sign-in popup (if needed)                           │
│ - Returns OAuth access token                                        │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ Send token to API:                                                  │
│ POST /auth/google                                                   │
│ Header: Authorization: Bearer <access_token>                        │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                         AZURE FUNCTIONS (Server)                    │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ Verify with Google tokeninfo endpoint:                              │
│ https://oauth2.googleapis.com/tokeninfo?access_token=...           │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ Validate:                                                           │
│ - Token is valid and not expired                                    │
│ - Audience matches GOOGLE_CLIENT_ID                                 │
│ - Extract user's Google subject (sub)                               │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ Generate stable userId:                                             │
│ SHA-256("google:" + sub) → 64-character hex string                 │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ Response: { userId: "abc123...", authProvider: "google" }          │
└────────────────────────────────────────────────────────────────────┘
```

### Manifest Configuration

```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "497790964210-...apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/userinfo.email"]
  }
}
```

---

## File Structure

```
tabflow/
├── .github/
│   └── workflows/
│       ├── validate.yml          # PR validation (lint, type-check, build)
│       ├── build-extension.yml   # Build extension, upload artifact
│       └── deploy-api.yml        # Deploy API to Azure
│
├── apps/
│   ├── extension/
│   │   ├── src/
│   │   │   ├── manifest.json     # Chrome extension manifest
│   │   │   ├── vite-env.d.ts     # Vite env types
│   │   │   │
│   │   │   ├── background/       # Service worker
│   │   │   │   ├── index.ts      # Entry point, event listeners
│   │   │   │   ├── messaging.ts  # Message router (all actions)
│   │   │   │   ├── tabCapture.ts # Chrome tabs API wrapper
│   │   │   │   ├── undo.ts       # Undo stack management
│   │   │   │   ├── alarms.ts     # Backup scheduler
│   │   │   │   ├── cloudSync.ts  # Cloud sync orchestration
│   │   │   │   ├── cloudApi.ts   # HTTP client for API
│   │   │   │   ├── encryption.ts # AES-256-GCM encryption
│   │   │   │   └── auth.ts       # Google auth helper
│   │   │   │
│   │   │   ├── popup/            # Popup UI
│   │   │   │   ├── App.tsx       # Main component
│   │   │   │   ├── index.tsx     # Entry point
│   │   │   │   ├── styles.css    # Tailwind styles
│   │   │   │   ├── components/   # UI components
│   │   │   │   │   ├── ActionBar.tsx
│   │   │   │   │   ├── SessionList.tsx
│   │   │   │   │   ├── SessionCard.tsx
│   │   │   │   │   ├── SearchBar.tsx
│   │   │   │   │   ├── SaveModal.tsx
│   │   │   │   │   └── ...
│   │   │   │   └── hooks/
│   │   │   │       ├── useMessage.ts
│   │   │   │       └── useSessions.ts
│   │   │   │
│   │   │   ├── options/          # Options page
│   │   │   │   ├── App.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   ├── styles.css
│   │   │   │   ├── components/
│   │   │   │   └── hooks/
│   │   │   │
│   │   │   ├── storage/          # IndexedDB layer
│   │   │   │   ├── db.ts         # Database connection
│   │   │   │   ├── sessions.ts   # Session CRUD
│   │   │   │   ├── backups.ts    # Backup operations
│   │   │   │   ├── undoStore.ts  # Undo persistence
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── shared/           # Shared code
│   │   │       ├── types.ts      # All interfaces
│   │   │       ├── messages.ts   # Message action constants
│   │   │       ├── constants.ts  # Configuration constants
│   │   │       ├── validators.ts # Runtime validation
│   │   │       ├── errorMessages.ts
│   │   │       ├── lib/utils.ts  # Tailwind cn() helper
│   │   │       └── components/ui/  # shadcn/ui components
│   │   │
│   │   ├── public/icons/         # Extension icons
│   │   ├── popup.html
│   │   ├── options.html
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   └── api/
│       ├── src/
│       │   ├── index.ts          # Function registration
│       │   ├── functions/
│       │   │   ├── authGoogle.ts
│       │   │   ├── syncUpload.ts
│       │   │   └── syncDownload.ts
│       │   └── lib/
│       │       ├── auth/googleAuth.ts
│       │       ├── storage/blobStorage.ts
│       │       ├── cors/cors.ts
│       │       └── validation/
│       │
│       ├── host.json
│       ├── local.settings.json.example
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                         # Documentation
├── privacy.md                    # Privacy policy
├── README.md                     # Main readme
├── ARCHITECTURE.md               # This file
└── package.json                  # Root workspace
```

---

## Configuration & Constants

### Extension Constants (constants.ts)

```typescript
// IndexedDB
export const DB_NAME = "tabflow";
export const DB_VERSION = 1;

// Storage Limits
export const MAX_TABS_FREE = 100;
export const MAX_UNDO_DEPTH = 10;
export const MAX_BACKUPS_RETAINED = 24;
export const MAX_SESSION_NAME_LENGTH = 40;

// Timing
export const BACKUP_INTERVAL_MINUTES = 60;
export const UNDO_PERSIST_DEBOUNCE_MS = 500;
export const SEARCH_DEBOUNCE_MS = 200;
export const ERROR_TOAST_DURATION_MS = 5000;

// Cloud Sync
export const CLOUD_API_BASE_URL = import.meta.env.VITE_CLOUD_API_URL;
export const CLOUD_SYNC_SCHEMA_VERSION = 1;
export const ENCRYPTION_SALT = "tabflow-v1";
export const ENCRYPTION_KEY_MATERIAL = import.meta.env.VITE_ENCRYPTION_KEY;
```

### Environment Variables

#### Extension (Build-time via Vite)

| Variable              | Description                   |
| --------------------- | ----------------------------- |
| `VITE_CLOUD_API_URL`  | Azure Functions API URL       |
| `VITE_ENCRYPTION_KEY` | Encryption key for cloud sync |

#### API (Runtime)

| Variable                    | Description                                   |
| --------------------------- | --------------------------------------------- |
| `GOOGLE_CLIENT_ID`          | Google OAuth Client ID                        |
| `STORAGE_CONNECTION_STRING` | Azure Storage connection string               |
| `BLOB_CONTAINER_NAME`       | Blob container name (default: `tabflow-sync`) |
| `DEV_MODE_ENABLED`          | Enable dev auth bypass (local only)           |
| `CORS_ALLOWED_ORIGINS`      | Additional CORS origins                       |

---

## Build & Deployment

### Extension Build

```bash
# Development (with hot reload)
npm run extension:dev

# Production build
npm run extension:build
# Output: apps/extension/dist/
```

### API Build

```bash
# Build TypeScript
npm run api:build

# Start local server (requires Azurite)
npm run api:start
```

### CI/CD Pipelines

| Workflow              | Trigger       | Action                           |
| --------------------- | ------------- | -------------------------------- |
| `validate.yml`        | Pull requests | Lint, type-check, build          |
| `build-extension.yml` | Push to main  | Build extension, upload artifact |
| `deploy-api.yml`      | Push to main  | Deploy to Azure Functions        |

---

## Security Model

### Privacy Guarantees

| Principle                       | Implementation                        |
| ------------------------------- | ------------------------------------- |
| **Local-first**                 | All data stored locally by default    |
| **No background sync**          | Cloud sync is manual, user-initiated  |
| **Client-side encryption**      | AES-256-GCM before upload             |
| **Server never sees plaintext** | Payload is opaque blob                |
| **No analytics**                | No telemetry, tracking, or usage data |
| **No ads**                      | No advertising                        |

### Authentication Security

- Google tokens verified server-side with Google's tokeninfo endpoint
- Tokens never logged
- User IDs are SHA-256 hashed (privacy-safe)
- CORS restricted to published extension origin

### Encryption Security

- Key from environment variable (not in code)
- PBKDF2 with 100,000 iterations (brute-force resistant)
- Random IV per encryption (prevents pattern analysis)
- AES-GCM provides authentication (detects tampering)

### What TabFlow Does NOT Do

- ❌ Read page content
- ❌ Track browsing history
- ❌ Auto-sync in background
- ❌ Send any data without user action
- ❌ Store unencrypted data in cloud

---

## Future Roadmap (Not Implemented)

| Feature                       | Status            |
| ----------------------------- | ----------------- |
| AI-powered tab grouping       | Planned (Phase 2) |
| Magic link auth (non-Chrome)  | Planned           |
| Cross-browser support         | Not planned       |

---

## Quick Reference

### Key Interfaces

```typescript
// Core data
interface TabSnapshot {
  title;
  url;
  domain;
  favicon;
  lastAccessed;
}
interface Group {
  id;
  name;
  tabs: TabSnapshot[];
}
interface Session {
  id;
  name;
  createdAt;
  groups: Group[];
}

// Messaging
interface Message {
  action: MessageActionType;
  payload?;
}
interface MessageResponse {
  success;
  data?;
  error?;
}

// Undo
interface UndoEntry {
  type;
  timestamp;
  data;
}

// Settings
interface Settings {
  autoBackup;
  backupFrequencyHours;
  aiOptIn;
}

// Backup
interface BackupBlob {
  version;
  timestamp;
  sessions;
  settings?;
}
```

### Key Functions

```typescript
// Tab capture
getCurrentWindowTabs(): Promise<TabSnapshot[]>
restoreSessionTabs(groups): Promise<number>

// Sessions
getAllSessions(): Promise<Session[]>
createSession(name, tabs): Promise<Session>
deleteSession(id): Promise<Session | undefined>

// Encryption
encryptData(plaintext): Promise<string>
decryptData(encrypted): Promise<string>

// Cloud sync
handleCloudUpload(): Promise<UploadResult>
handleCloudDownloadPreview(): Promise<PreviewResult>
handleCloudApplyRestore(sessionsJson): Promise<Result>
```

---

