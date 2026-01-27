# TabFlow API

> Azure Functions backend for authentication and encrypted cloud sync used by the TabFlow Chrome extension.

---

## Overview

The TabFlow API provides a minimal, privacy-first backend responsible for:

- **Google Authentication** – Verifying Google ID tokens
- **Stable User IDs** – Generating deterministic, privacy-safe user identifiers
- **Cloud Sync Upload** – Storing encrypted session data
- **Cloud Sync Download** – Retrieving encrypted session data

The API never sees or processes plaintext user data. All session payloads are encrypted client-side and treated as opaque blobs.

---

## Tech Stack

- **Runtime:** Azure Functions v4 (Node.js 18+ / 22 recommended)
- **Language:** TypeScript
- **Authentication:** Google OAuth (google-auth-library)
- **Storage:** Azure Blob Storage

---

## API Endpoints

| Method | Endpoint             | Description                                     |
| ------ | -------------------- | ----------------------------------------------- |
| POST   | `/api/auth/google`   | Verify Google ID token and return stable userId |
| POST   | `/api/sync/upload`   | Upload encrypted session payload                |
| GET    | `/api/sync/download` | Download encrypted session payload              |

---

## Authentication Flow

1. Extension retrieves a Google ID token using `chrome.identity`
2. Token is sent to `/api/auth/google`
3. API verifies the token with Google
4. A stable `userId` is generated using SHA-256 hashing
5. `userId` is used as the namespace for blob storage

---

## Local Development

### Prerequisites

- Node.js 18+ (22 recommended)
- Azure Functions Core Tools v4
- Azurite (or Azure Storage account)

---

### Setup

```bash
cd apps/api
npm install
cp local.settings.json.example local.settings.json
```

Edit `local.settings.json` and configure:

- `GOOGLE_CLIENT_ID`
- `STORAGE_CONNECTION_STRING`

---

### Run Locally

```bash
npm run build
npm run start
```

API will be available at:

```
http://localhost:7071
```

If using Azurite:

```bash
npm install -g azurite
azurite --silent --location .azurite --debug .azurite/debug.log
```

---

## Example Requests

### Verify Google Token

```bash
curl -X POST http://localhost:7071/api/auth/google \
  -H "Authorization: Bearer YOUR_GOOGLE_TOKEN"
```

Response:

```json
{
  "userId": "a1b2c3d4e5f6...",
  "authProvider": "google"
}
```

---

### Upload Encrypted Data

```bash
curl -X POST http://localhost:7071/api/sync/upload \
  -H "Authorization: Bearer YOUR_GOOGLE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "base64-encrypted-data",
    "schemaVersion": 1,
    "clientTimestamp": 1706140800000
  }'
```

Response:

```json
{
  "status": "ok",
  "syncedAt": "2024-01-25T12:00:00.000Z"
}
```

---

### Download Encrypted Data

```bash
curl http://localhost:7071/api/sync/download \
  -H "Authorization: Bearer YOUR_GOOGLE_TOKEN"
```

Response:

```json
{
  "payload": "base64-encrypted-data",
  "schemaVersion": 1,
  "lastSyncedAt": "2024-01-25T12:00:00.000Z"
}
```

**No data:** returns `204 No Content`

---

## Environment Variables

### Required

| Variable                    | Description                     |
| --------------------------- | ------------------------------- |
| `GOOGLE_CLIENT_ID`          | Google OAuth 2.0 Client ID      |
| `STORAGE_CONNECTION_STRING` | Azure Storage connection string |

### Optional

| Variable                      | Description                                                    | Default        |
| ----------------------------- | -------------------------------------------------------------- | -------------- |
| `BLOB_CONTAINER_NAME`         | Blob container name                                            | `tabflow-sync` |
| `DEV_MODE_ENABLED`            | Disable auth locally                                           | `false`        |
| `CORS_ALLOWED_ORIGINS`        | Extra allowed origins                                          | –              |
| `AZURE_FUNCTIONS_ENVIRONMENT` | Azure Functions environment (Development, Staging, Production) | –              |

---

## Example `local.settings.json`

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
    "STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "BLOB_CONTAINER_NAME": "tabflow-sync",
    "DEV_MODE_ENABLED": "true"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

---

## Project Structure

```
apps/api/
├── src/
│   ├── index.ts                 # Function registration
│   ├── functions/
│   │   ├── authGoogle.ts        # POST /api/auth/google
│   │   ├── syncUpload.ts        # POST /api/sync/upload
│   │   └── syncDownload.ts      # GET /api/sync/download
│   └── lib/
│       ├── auth/                # Google token verification
│       ├── storage/             # Azure Blob operations
│       ├── cors/                # CORS handling
│       └── validation/
├── dist/                        # Compiled output
├── host.json
├── local.settings.json.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Blob Storage Layout

```
tabflow-sync/
└── users/
    └── {userId}/
        └── sessions.enc.json
```

Each user has exactly one encrypted blob.

---

## Security Guarantees

- ID tokens are never logged
- Tokens are verified server-side with Google
- User IDs are SHA-256 hashed
- Payloads are opaque to the server
- Secrets are excluded from logs
- CORS restricted to extension origin in production

---

## Available Commands

| Command                | Description          |
| ---------------------- | -------------------- |
| `npm run build`        | Compile TypeScript   |
| `npm run watch`        | Watch mode           |
| `npm run start`        | Start Functions host |
| `npm run clean`        | Remove dist          |
| `npm run format`       | Format code          |
| `npm run format:check` | Check formatting     |

---

## Deployment

### GitHub Actions (Recommended)

Push to `main` triggers automatic deployment.

Required secret:

- `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`

---

### Manual Deployment

```bash
npm run build
func azure functionapp publish YOUR_APP_NAME
```

---

## License

MIT

---
