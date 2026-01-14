/**
 * TabFlow – Popup Root Component
 *
 * Main popup UI. Coordinates state and message passing.
 * All Chrome API calls go through the background service worker.
 */

import React, { useState, useCallback } from "react";
import type { Session } from "@shared/types";
import { MessageAction } from "@shared/messages";
import { sendMessage } from "./hooks/useMessage";
import { useSessions } from "./hooks/useSessions";
import {
  ActionBar,
  SearchBar,
  SessionList,
  LoadingState,
  ErrorToast,
  SuccessToast,
  SaveModal,
  ConfirmDialog,
} from "./components";

const App: React.FC = () => {
  // Session state from hook
  const { sessions, loading, error: fetchError, refetch } = useSessions();

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [undoCount, setUndoCount] = useState(0);

  // Modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  // Toast state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch undo stack size on mount
  React.useEffect(() => {
    const fetchUndoCount = async () => {
      try {
        const stack = await sendMessage(MessageAction.GET_UNDO_STACK);
        setUndoCount(stack.length);
      } catch {
        // Ignore errors
      }
    };
    fetchUndoCount();
  }, []);

  // Handle save session (with modal)
  const handleSaveClick = useCallback(() => {
    setShowSaveModal(true);
  }, []);

  const handleSave = useCallback(
    async (name: string) => {
      setSaving(true);
      setError(null);

      try {
        const session = await sendMessage(MessageAction.SAVE_SESSION, { name });
        await refetch();
        setUndoCount((c) => Math.min(c + 1, 10));
        setSuccess(`Saved ${session.groups[0]?.tabs.length || 0} tabs`);
        setShowSaveModal(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save session");
      } finally {
        setSaving(false);
      }
    },
    [refetch]
  );

  // Handle undo
  const handleUndo = useCallback(async () => {
    setUndoing(true);
    setError(null);

    try {
      const result = await sendMessage(MessageAction.UNDO);
      await refetch();

      if (result.undone) {
        setUndoCount((c) => Math.max(c - 1, 0));
        const actionName =
          result.undone.type === "SAVE_SESSION"
            ? "save"
            : result.undone.type === "DELETE_SESSION"
              ? "delete"
              : result.undone.type === "RENAME_SESSION"
                ? "rename"
                : result.undone.type === "IMPORT"
                  ? "import"
                  : "action";
        setSuccess(`Restored — ${actionName} undone`);
      } else {
        setError("Nothing to undo");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo");
    } finally {
      setUndoing(false);
    }
  }, [refetch]);

  // Handle restore session
  const handleRestore = useCallback(async (sessionId: string) => {
    setRestoringId(sessionId);
    setError(null);

    try {
      const result = await sendMessage(MessageAction.RESTORE_SESSION, { sessionId });
      setSuccess(`Opened ${result.tabsOpened} tab${result.tabsOpened !== 1 ? "s" : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore session");
    } finally {
      setRestoringId(null);
    }
  }, []);

  // Handle delete session (with confirmation)
  const handleDeleteClick = useCallback((sessionId: string) => {
    setDeleteSessionId(sessionId);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteSessionId) return;

    setDeletingId(deleteSessionId);
    setError(null);

    try {
      await sendMessage(MessageAction.DELETE_SESSION, { sessionId: deleteSessionId });
      await refetch();
      setUndoCount((c) => Math.min(c + 1, 10));
      setSuccess("Session removed — you can undo this");
      setDeleteSessionId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setDeletingId(null);
    }
  }, [deleteSessionId, refetch]);

  // Handle rename session
  const handleRename = useCallback(
    async (sessionId: string, newName: string) => {
      setRenamingId(sessionId);
      setError(null);

      try {
        await sendMessage(MessageAction.RENAME_SESSION, { sessionId, newName });
        await refetch();
        setUndoCount((c) => Math.min(c + 1, 10));
        setSuccess("Session renamed");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to rename session");
      } finally {
        setRenamingId(null);
      }
    },
    [refetch]
  );

  // Handle copy links (clipboard write in popup context)
  const handleCopyLinks = useCallback(async (session: Session) => {
    try {
      // Collect all URLs from all groups
      const urls = session.groups
        .flatMap((group) => group.tabs)
        .map((tab) => tab.url)
        .join("\n");

      // Write to clipboard (popup has clipboard access)
      await navigator.clipboard.writeText(urls);

      const tabCount = session.groups.reduce((sum, g) => sum + g.tabs.length, 0);
      setSuccess(`Copied ${tabCount} link${tabCount !== 1 ? "s" : ""}`);
    } catch (err) {
      setError("Failed to copy links");
      console.error("[TabFlow] Clipboard write failed:", err);
    }
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Find session name for delete confirmation
  const sessionToDelete = deleteSessionId ? sessions.find((s) => s.id === deleteSessionId) : null;

  return (
    <div className="flex max-h-popup min-h-[300px] w-popup flex-col bg-surface-50 dark:bg-surface-900">
      {/* Top Bar - Warm, grounding header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-stone-100 bg-white px-4 py-3 dark:border-surface-800 dark:bg-surface-850">
        {/* Left: Branding */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 shadow-sm">
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">TabFlow</span>
        </div>

        {/* Center: Session count - reassuring */}
        <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"} saved
        </span>

        {/* Right: Settings gear */}
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="-mr-1 rounded-lg p-2 text-stone-400 transition-all duration-200 hover:bg-stone-50 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-surface-800 dark:hover:text-stone-300"
          title="Settings"
          aria-label="Open settings"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto px-3 py-3">
        {/* Primary Action Area */}
        <div className="mb-3">
          <ActionBar
            onSave={handleSaveClick}
            onUndo={handleUndo}
            saving={saving}
            undoing={undoing}
            canUndo={undoCount > 0}
          />
        </div>

        {/* Search - Gentle utility */}
        <div className="mb-3">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Sessions List */}
        {loading ? (
          <LoadingState count={2} />
        ) : fetchError ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-surface-800">
              <svg
                className="h-5 w-5 text-stone-400 dark:text-stone-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <p className="mb-2 text-sm text-stone-600 dark:text-stone-400">Something went wrong</p>
            <button
              onClick={refetch}
              className="text-sm text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Try again
            </button>
          </div>
        ) : (
          <SessionList
            sessions={sessions}
            searchQuery={searchQuery}
            onRestore={handleRestore}
            onDelete={handleDeleteClick}
            onRename={handleRename}
            onCopyLinks={handleCopyLinks}
            restoringId={restoringId}
            deletingId={deletingId}
            renamingId={renamingId}
          />
        )}
      </main>

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete Confirmation - Reassuring, not alarming */}
      <ConfirmDialog
        isOpen={!!deleteSessionId}
        title="Remove this session?"
        message={`"${sessionToDelete?.name || "Session"}" will be removed. Don't worry — you can undo this right after.`}
        confirmLabel="Remove"
        cancelLabel="Keep it"
        variant="gentle"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteSessionId(null)}
        loading={deletingId === deleteSessionId}
      />

      {/* Toasts */}
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessToast message={success} onDismiss={() => setSuccess(null)} />}
    </div>
  );
};

export default App;
