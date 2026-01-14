# TabFlow API

Azure Functions backend for TabFlow Chrome Extension.

## Overview

This API provides:

- **Google Authentication** - Verify Google ID tokens and generate stable user IDs

## Tech Stack

- Azure Functions v4 (Node.js runtime)
- TypeScript
- google-auth-library for token verification

## Local Development

### Prerequisites

1. Node.js 18+
2. Azure Functions Core Tools v4
3. Azure Storage Emulator (Azurite) or Azure Storage account

### Setup

```bash
# Install dependencies
npm install

# Copy local settings template
cp local.settings.json.example local.settings.json

# Edit local.settings.json and add your GOOGLE_CLIENT_ID
```

### Running Locally

```bash
# Build TypeScript
npm run build

# Start Azure Functions host
npm start
```

The API will be available at `http://localhost:7071`

### Available Endpoints

#### POST /auth/google

Verify a Google ID token and get a stable userId.

**Request:**

```bash
curl -X POST http://localhost:7071/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "YOUR_GOOGLE_ID_TOKEN"}'
```

Or with Authorization header:

```bash
curl -X POST http://localhost:7071/auth/google \
  -H "Authorization: Bearer YOUR_GOOGLE_ID_TOKEN"
```

**Response (200):**

```json
{
  "userId": "a1b2c3d4e5f6...",
  "authProvider": "google"
}
```

**Error Response (401):**

```json
{
  "error": "Token verification failed",
  "code": "VERIFICATION_FAILED"
}
```

## Environment Variables

| Variable                    | Description                       | Required |
| --------------------------- | --------------------------------- | -------- |
| `GOOGLE_CLIENT_ID`          | Google OAuth 2.0 Client ID        | Yes      |
| `STORAGE_CONNECTION_STRING` | Azure Storage connection (future) | No       |
| `BLOB_CONTAINER_NAME`       | Blob container for sync (future)  | No       |

## Security

- ID tokens are NEVER logged
- All tokens are verified server-side with Google
- User IDs are derived from SHA-256 hash of Google subject
- No sensitive data is stored (no database yet)

## Project Structure

```
apps/api/
├── src/
│   ├── functions/
│   │   └── authGoogle.ts      # Google auth endpoint
│   ├── lib/
│   │   └── auth/
│   │       ├── googleAuth.ts  # Token verification
│   │       └── index.ts
│   └── index.ts               # Function registration
├── host.json                  # Azure Functions config
├── local.settings.json        # Local dev settings (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

Deployed via Azure DevOps or GitHub Actions to Azure Functions.

```bash
# Build for production
npm run build

# Deploy (via Azure CLI)
func azure functionapp publish <APP_NAME>
```
