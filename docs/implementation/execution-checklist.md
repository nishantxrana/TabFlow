# TabFlow – MVP Execution Checklist

> **Scope:** Phase 1 only (local-first tab manager, no AI, no Azure, no payments)  
> **Rule:** Each step is small, verifiable, and has a clear "done when" condition.  
> **Order:** Execute steps sequentially unless noted as parallelizable.

---

## Stage 1: Project Scaffold

### 1. Initialize npm project

Create `package.json` with project metadata.  
**Done when:** `npm init -y` succeeds; `package.json` exists with name `tabflow`.

### 2. Install TypeScript and configure

Install `typescript` as dev dependency; create `tsconfig.json` with strict mode.  
**Done when:** `npx tsc --version` works; `tsconfig.json` has `"strict": true`.

### 3. Install Vite and configure for Chrome Extension

Install `vite` and `@crxjs/vite-plugin` (or similar); create `vite.config.ts`.  
**Done when:** `npm run build` produces a `dist/` folder (even if empty).

### 4. Install React

Install `react` and `react-dom`; install `@types/react` and `@types/react-dom`.  
**Done when:** `import React from 'react'` compiles without error.

### 5. Install Tailwind CSS

Install `tailwindcss`, `postcss`, `autoprefixer`; create `tailwind.config.js` and `postcss.config.js`.  
**Done when:** Tailwind classes compile; a test `<div className="text-red-500">` renders red text.

### 6. Create folder structure

Create all directories per implementation plan: `src/background/`, `src/popup/`, `src/options/`, `src/storage/`, `src/shared/`, `public/`.  
**Done when:** All directories exist; `ls src/` shows 5 subdirectories.

### 7. Create manifest.json (Manifest V3)

Create `src/manifest.json` with:

- `manifest_version: 3`
- `name`, `version`, `description`
- `action.default_popup` pointing to `popup.html`
- `options_page` pointing to `options.html`
- `background.service_worker` pointing to background entry
- `permissions: ["tabs", "storage", "alarms"]`

**Done when:** Manifest is valid JSON; Chrome accepts it when loaded as unpacked extension (may show errors for missing files).

### 8. Create placeholder HTML files

Create `public/popup.html` and `public/options.html` with minimal HTML structure and React root div.  
**Done when:** Both files exist; each has a `<div id="root"></div>`.

### 9. Create placeholder icons

Add placeholder icons (16x16, 48x48, 128x128) in `public/icons/`.  
**Done when:** `icon-16.png`, `icon-48.png`, `icon-128.png` exist (can be solid color placeholders).

### 10. Verify extension loads in Chrome

Load unpacked extension from `dist/` folder in `chrome://extensions`.  
**Done when:** Extension appears in Chrome toolbar; clicking it opens empty popup; no console errors in service worker.

---

## Stage 2: Shared Types and Constants

### 11. Define core types in `shared/types.ts`

Create interfaces: `TabSnapshot`, `Group`, `Session`, `UndoEntry`, `Settings`, `BackupBlob`.  
**Done when:** File compiles; all 6 interfaces are exported.

### 12. Define message types in `shared/messages.ts`

Create `MessageAction` const object with all action strings; create `Message<T>` and `Response<T>` interfaces.  
**Done when:** File compiles; `MessageAction.GET_SESSIONS` resolves to `"GET_SESSIONS"`.

### 13. Define constants in `shared/constants.ts`

Create constants: `DB_NAME`, `DB_VERSION`, `MAX_UNDO_DEPTH`, `MAX_TABS_FREE`, `BACKUP_INTERVAL_MINUTES`.  
**Done when:** File compiles; all 5 constants are exported.

### 14. Create import validator in `shared/validators.ts`

Create `validateImportSchema(data: unknown): boolean` function stub (returns true for now).  
**Done when:** Function exists and can be imported; returns `true`.

---

## Stage 3: IndexedDB Storage Layer

### 15. Create database connection in `storage/db.ts`

Implement `openDB()` function using `idb` library or raw IndexedDB; create object stores on upgrade:

- `sessions` (keyPath: `id`, index: `byCreatedAt`)
- `undoStack` (autoIncrement)
- `backups` (keyPath: none, use timestamp as key)

**Done when:** `openDB()` returns a DB instance; stores exist when inspected in DevTools > Application > IndexedDB.

### 16. Implement session CRUD in `storage/sessions.ts`

Create functions:

- `getAllSessions(): Promise<Session[]>`
- `getSession(id: string): Promise<Session | undefined>`
- `saveSession(session: Session): Promise<void>`
- `deleteSession(id: string): Promise<Session | undefined>`
- `clearAllSessions(): Promise<void>`

**Done when:** All 5 functions exist; manual test: save a session, read it back, delete it, verify it's gone.

### 17. Implement undo persistence in `storage/undoStore.ts`

Create functions:

- `loadUndoStack(): Promise<UndoEntry[]>`
- `persistUndoStack(stack: UndoEntry[]): Promise<void>`

**Done when:** Both functions exist; manual test: persist 3 entries, reload, verify 3 entries returned.

### 18. Implement backup storage in `storage/backups.ts`

Create functions:

- `createBackup(sessions: Session[]): Promise<void>`
- `getLatestBackup(): Promise<BackupBlob | undefined>`
- `pruneOldBackups(keepCount: number): Promise<void>`

**Done when:** All 3 functions exist; manual test: create backup, retrieve it, verify data matches.

---

## Stage 4: Background Service Worker Core

### 19. Create background entry point `background/index.ts`

Register event listeners:

- `chrome.runtime.onInstalled` → log "installed"
- `chrome.runtime.onMessage` → forward to messaging handler
- Initialize DB on load

**Done when:** Service worker loads without errors; "installed" appears in console on first install.

### 20. Implement tab capture in `background/tabCapture.ts`

Create functions:

- `getCurrentWindowTabs(): Promise<TabSnapshot[]>`
- `extractTabSnapshot(tab: chrome.tabs.Tab): TabSnapshot`

**Done when:** `getCurrentWindowTabs()` returns array of tab snapshots with title, url, domain, favicon.

### 21. Implement message router in `background/messaging.ts`

Create `handleMessage(message, sender, sendResponse)` function with switch/case for all `MessageAction` values. Return `{ success: false, error: "Not implemented" }` for unimplemented actions.  
**Done when:** Popup can send any message; background responds (even if with "not implemented").

### 22. Implement GET_SESSIONS handler

In messaging router, handle `GET_SESSIONS`: call `getAllSessions()`, return sessions array.  
**Done when:** Popup sends `GET_SESSIONS`; receives array (empty is OK).

### 23. Implement SAVE_SESSION handler

In messaging router, handle `SAVE_SESSION`:

1. Call `getCurrentWindowTabs()`
2. Create `Session` object with UUID, timestamp, tabs
3. Call `saveSession()`
4. Return created session

**Done when:** Popup sends `SAVE_SESSION`; session appears in IndexedDB; response contains session object.

### 24. Implement RESTORE_SESSION handler

In messaging router, handle `RESTORE_SESSION`:

1. Get session by ID
2. For each tab, call `chrome.tabs.create({ url })`
3. Return `{ tabsOpened: count }`

**Done when:** Popup sends `RESTORE_SESSION` with valid ID; tabs open in browser; response shows count.

### 25. Implement DELETE_SESSION handler

In messaging router, handle `DELETE_SESSION`:

1. Call `deleteSession(id)`
2. Return `{ success: true }`

**Done when:** Popup sends `DELETE_SESSION`; session removed from IndexedDB.

---

## Stage 5: Undo System

### 26. Create undo module in `background/undo.ts`

Create:

- In-memory `undoStack: UndoEntry[]` array
- `pushUndo(entry: UndoEntry): void` (adds to stack, caps at MAX_UNDO_DEPTH)
- `popUndo(): UndoEntry | undefined`
- `getUndoStack(): UndoEntry[]`

**Done when:** Functions exist; push 3 entries, pop 1, verify 2 remain.

### 27. Integrate undo with SAVE_SESSION

After saving session, call `pushUndo({ type: 'SAVE_SESSION', sessionId })`.  
**Done when:** Save a session; undo stack has 1 entry with correct sessionId.

### 28. Integrate undo with DELETE_SESSION

Before deleting, store full session; after deleting, call `pushUndo({ type: 'DELETE_SESSION', session })`.  
**Done when:** Delete a session; undo stack has entry with full session data.

### 29. Implement UNDO handler

In messaging router, handle `UNDO`:

1. Pop from undo stack
2. Switch on entry type:
   - `SAVE_SESSION`: delete the session
   - `DELETE_SESSION`: re-save the session
3. Return `{ undone: entry }`

**Done when:** Save session → undo → session is gone; delete session → undo → session is back.

### 30. Persist undo stack on changes

After every `pushUndo` or `popUndo`, call `persistUndoStack()` (debounce 500ms).  
**Done when:** Save session; close/reopen extension; undo stack still has entry.

### 31. Rehydrate undo stack on service worker wake

In `background/index.ts` init, call `loadUndoStack()` and populate in-memory array.  
**Done when:** Add undo entry; force service worker restart; entry still available.

---

## Stage 6: Backup System

### 32. Create alarms module in `background/alarms.ts`

Register:

- `chrome.alarms.create('hourlyBackup', { periodInMinutes: 60 })`
- `chrome.alarms.onAlarm` listener that calls `createBackup()` when alarm fires

**Done when:** Alarm is registered (visible in DevTools); backup created on alarm (test with 1-minute interval).

### 33. Implement EXPORT_DATA handler

In messaging router, handle `EXPORT_DATA`:

1. Get all sessions
2. Get settings from chrome.storage.local
3. Return JSON string of `{ version: 1, sessions, settings }`

**Done when:** Popup/options sends `EXPORT_DATA`; receives valid JSON string.

### 34. Implement IMPORT_DATA handler

In messaging router, handle `IMPORT_DATA`:

1. Parse JSON
2. Validate schema (use validator)
3. Store previous sessions for undo
4. Clear all sessions
5. Write imported sessions
6. Push undo entry
7. Return `{ sessionsImported: count }`

**Done when:** Export data; clear all; import; sessions restored; undo reverts import.

---

## Stage 7: Settings System

### 35. Implement GET_SETTINGS handler

In messaging router, handle `GET_SETTINGS`:

1. Read from `chrome.storage.local.get('settings')`
2. Return settings (or defaults if not set)

**Done when:** Popup/options sends `GET_SETTINGS`; receives settings object.

### 36. Implement UPDATE_SETTINGS handler

In messaging router, handle `UPDATE_SETTINGS`:

1. Write to `chrome.storage.local.set({ settings: payload })`
2. Return `{ success: true }`

**Done when:** Update settings; read back; values match.

### 37. Implement GET_TIER handler

In messaging router, handle `GET_TIER`:

1. Read from `chrome.storage.local.get('tier')`
2. Return `"free"` or `"pro"` (default to `"free"`)

**Done when:** Handler returns tier; default is "free".

---

## Stage 8: Popup UI Foundation

### 38. Create popup entry point `popup/index.tsx`

Mount React app to `#root` div.  
**Done when:** Popup opens; React app renders (can be "Hello World").

### 39. Create useMessage hook `popup/hooks/useMessage.ts`

Implement typed `sendMessage<T>(action, payload?)` wrapper.  
**Done when:** Hook can be imported; calling it sends message to background.

### 40. Create useSessions hook `popup/hooks/useSessions.ts`

Implement hook that fetches sessions on mount using `sendMessage('GET_SESSIONS')`.  
**Done when:** Hook returns `{ sessions, loading, error, refetch }`.

### 41. Create App.tsx shell

Create root component with:

- `useSessions()` call
- Loading state
- Error state
- Placeholder for session list

**Done when:** Popup shows loading, then either sessions or error.

### 42. Create LoadingState component

Create `popup/components/LoadingState.tsx` with skeleton UI.  
**Done when:** Component renders skeleton; used in App.tsx.

### 43. Create ErrorToast component

Create `popup/components/ErrorToast.tsx` that displays error message.  
**Done when:** Component renders error; auto-dismisses after 5s.

---

## Stage 9: Popup UI Session Management

### 44. Create SessionList component

Create `popup/components/SessionList.tsx` that receives sessions array and renders list.  
**Done when:** Component renders list of session names/dates; empty state if no sessions.

### 45. Create SessionCard component

Create `popup/components/SessionCard.tsx` showing:

- Session name (or "Untitled")
- Created date
- Tab count
- Restore button
- Delete button

**Done when:** Card displays all info; buttons are clickable (no handlers yet).

### 46. Wire up Restore button

In SessionCard, Restore button calls `sendMessage('RESTORE_SESSION', { sessionId })`.  
**Done when:** Click Restore; tabs open; success feedback shown.

### 47. Wire up Delete button

In SessionCard, Delete button calls `sendMessage('DELETE_SESSION', { sessionId })` then refetches sessions.  
**Done when:** Click Delete; session removed from list; can undo.

### 48. Create ActionBar component

Create `popup/components/ActionBar.tsx` with:

- Save Session button
- Undo button (disabled if stack empty)

**Done when:** Component renders both buttons.

### 49. Wire up Save Session button

Save button calls `sendMessage('SAVE_SESSION')` then refetches sessions.  
**Done when:** Click Save; new session appears in list.

### 50. Wire up Undo button

Undo button calls `sendMessage('UNDO')` then refetches sessions.  
**Done when:** Save → Undo → session gone; Delete → Undo → session back.

### 51. Create TabItem component

Create `popup/components/TabItem.tsx` showing tab favicon, title, domain.  
**Done when:** Component renders tab info cleanly.

### 52. Create GroupView component

Create `popup/components/GroupView.tsx` that renders list of TabItems for a session.  
**Done when:** SessionCard can expand to show tabs.

### 53. Add expand/collapse to SessionCard

SessionCard toggles GroupView visibility on click.  
**Done when:** Click session header; tabs shown/hidden.

---

## Stage 10: Popup UI Search

### 54. Create SearchBar component

Create `popup/components/SearchBar.tsx` with text input.  
**Done when:** Component renders input; value is controlled.

### 55. Implement search filtering

SearchBar passes filter string up to App; App filters sessions by matching tab title/domain.  
**Done when:** Type in search; only matching sessions/tabs shown.

### 56. Add debounce to search

Filter updates debounced by 200ms.  
**Done when:** Rapid typing doesn't cause jank.

---

## Stage 11: Options Page

### 57. Create options entry point `options/index.tsx`

Mount React app to `#root` div.  
**Done when:** Options page opens; React app renders.

### 58. Create options App.tsx shell

Create root component that fetches settings on mount.  
**Done when:** Options page shows loading, then settings.

### 59. Create TierDisplay component

Create `options/components/TierDisplay.tsx` showing Free or Pro badge.  
**Done when:** Component shows current tier.

### 60. Create SettingsForm component

Create `options/components/SettingsForm.tsx` with:

- Auto-backup toggle
- Backup frequency dropdown

**Done when:** Form renders; values reflect current settings.

### 61. Wire up settings persistence

Settings changes call `sendMessage('UPDATE_SETTINGS')` (debounced).  
**Done when:** Change setting; reload options page; setting persisted.

### 62. Create BackupSection component

Create `options/components/BackupSection.tsx` with:

- Export Data button
- Import Data button (file input)
- Last backup timestamp

**Done when:** Component renders all elements.

### 63. Wire up Export button

Export button calls `sendMessage('EXPORT_DATA')` then triggers download.  
**Done when:** Click Export; JSON file downloads.

### 64. Wire up Import button

Import button reads file, calls `sendMessage('IMPORT_DATA', json)`, shows result.  
**Done when:** Select valid JSON file; sessions imported; UI updates.

### 65. Add import validation feedback

Show error if import fails validation.  
**Done when:** Select invalid JSON; error message shown.

---

## Stage 12: Polish and Verification

### 66. Style popup with Tailwind

Apply consistent styling: spacing, colors, typography, hover states.  
**Done when:** Popup looks polished; no unstyled elements.

### 67. Style options page with Tailwind

Apply consistent styling matching popup.  
**Done when:** Options page looks polished; consistent with popup.

### 68. Add popup width constraint

Set popup width to 400px; handle overflow.  
**Done when:** Popup is fixed width; content scrolls if needed.

### 69. Test popup mount time

Profile popup mount; ensure <50ms.  
**Done when:** Performance DevTools shows mount <50ms.

### 70. Test save/restore round-trip

Save 10+ tabs; restore; verify all tabs open with correct URLs.  
**Done when:** All tabs restored correctly.

### 71. Test undo for all actions

Test undo for: save, delete, import.  
**Done when:** All three undo correctly.

### 72. Test export/import round-trip

Export all data; clear sessions; import; verify identical.  
**Done when:** Sessions match original after import.

### 73. Test service worker restart

Force service worker termination; verify undo stack persists; verify backup alarm still fires.  
**Done when:** State survives service worker restart.

### 74. Test with 100 tabs

Open 100 tabs; save; restore; verify no errors or performance issues.  
**Done when:** 100-tab session saves/restores in <2s.

### 75. Clean up console logs

Remove or gate all `console.log` statements.  
**Done when:** No debug logs in production build.

### 76. Verify no lint errors

Run linter; fix all errors and warnings.  
**Done when:** `npm run lint` passes with 0 errors.

### 77. Verify TypeScript strict mode passes

Run `tsc --noEmit`; fix all type errors.  
**Done when:** `tsc --noEmit` exits with code 0.

### 78. Create production build

Run `npm run build`; verify `dist/` contains all required files.  
**Done when:** Extension loads from `dist/` in Chrome; all features work.

---

## Completion Criteria

Phase 1 is complete when:

- [ ] Extension installs and runs in Chrome
- [ ] Save session captures all open tabs
- [ ] Restore session opens all saved tabs
- [ ] Delete session removes from storage
- [ ] Undo reverts save, delete, and import
- [ ] Export creates valid JSON file
- [ ] Import restores from JSON file
- [ ] Settings persist across sessions
- [ ] Hourly backup runs automatically
- [ ] Popup mounts in <50ms
- [ ] No TypeScript or lint errors
- [ ] Works with 100+ tabs without degradation

---

## Next Phase

After completing this checklist, proceed to Phase 2:

- Azure Function scaffold
- AI grouping integration
- Tier enforcement

See `docs/roadmap/phases.md` for Phase 2 details.
