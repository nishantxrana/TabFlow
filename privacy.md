# TabFlow Privacy Policy

**Last Updated:** January 2026

TabFlow is a local-first Chrome extension for saving, organizing, and restoring browser tabs as sessions. This privacy policy describes what data TabFlow collects, how it is used, and your rights regarding that data.

---

## 1. Data Stored Locally

By default, all data is stored locally on your device using browser storage APIs:

- **Tab URLs and titles** — captured when you save a session
- **Session metadata** — session names, creation dates, and tab counts
- **Extension settings** — user preferences

This data never leaves your device unless you explicitly use the optional cloud sync feature.

---

## 2. Cloud Sync (Optional)

Cloud sync is **optional** and **user-initiated only**. TabFlow does not sync data automatically or in the background.

When you choose to sync:

1. **Client-side encryption** — Your session data (tab URLs and titles) is encrypted on your device before upload using a user-specific encryption key.
2. **Encrypted storage** — The encrypted data is stored in Azure Blob Storage. The server never sees or processes unencrypted tab data.
3. **Restore preview** — Before restoring from the cloud, you are shown a preview and must explicitly confirm the action.

---

## 3. Authentication

TabFlow uses Google authentication via Chrome's `chrome.identity` API for cloud sync features.

- Authentication is handled entirely by Chrome's built-in identity system.
- TabFlow receives a temporary access token to verify your identity.
- Authentication tokens are not stored long-term by the extension.
- Your Google email is used solely to associate your encrypted cloud data with your account.

---

## 4. Data We Do NOT Collect

TabFlow does not collect, transmit, or use:

- Analytics or telemetry data
- Browsing history beyond what you explicitly save as sessions
- Advertising identifiers
- Location data
- Personal information beyond email (for cloud sync authentication)

---

## 5. Third-Party Services

TabFlow uses the following third-party services:

| Service                      | Purpose                            |
| ---------------------------- | ---------------------------------- |
| Google Identity (via Chrome) | User authentication for cloud sync |
| Microsoft Azure Blob Storage | Encrypted cloud storage            |

No user data is shared with these services in unencrypted form. Azure receives only encrypted blobs that cannot be read without the user's encryption key.

---

## 6. Data Sharing

TabFlow does not sell, transfer, or share user data with third parties for any purpose, including:

- Advertising
- Marketing
- Creditworthiness assessment
- Any purpose unrelated to the extension's core functionality

---

## 7. Data Retention and Deletion

### Local Data

You can delete all local data at any time by:

1. Removing saved sessions within the extension
2. Uninstalling the extension (this removes all local storage)

### Cloud Data

If you have used cloud sync, you can delete your cloud data by:

1. Using the "Delete Cloud Data" option in the extension settings (if available)
2. Contacting us at the email below to request deletion

---

## 8. Remote Code

TabFlow does not use remote code. All JavaScript and WebAssembly code is bundled within the extension package. No code is fetched from external servers or evaluated dynamically.

---

## 9. Changes to This Policy

If this privacy policy is updated, the "Last Updated" date will be revised. Significant changes will be communicated through the extension update notes on the Chrome Web Store.

---

## 10. Contact

For questions, concerns, or data deletion requests:

**Email:** nishant.rana@example.com

---

## Summary

| Aspect          | Status                     |
| --------------- | -------------------------- |
| Default storage | Local only                 |
| Cloud sync      | Optional, user-initiated   |
| Encryption      | Client-side, before upload |
| Analytics       | None                       |
| Ads             | None                       |
| Tracking        | None                       |
| Data selling    | Never                      |
| Remote code     | None                       |
