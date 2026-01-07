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
            ? "Save"
            : result.undone.type === "DELETE_SESSION"
            ? "Delete"
            : result.undone.type === "RENAME_SESSION"
            ? "Rename"
            : result.undone.type === "IMPORT"
            ? "Import"
            : "Action";
        setSuccess(`Undid: ${actionName}`);
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
      setSuccess("Session deleted");
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
  const sessionToDelete = deleteSessionId
    ? sessions.find((s) => s.id === deleteSessionId)
    : null;

  return (
    <div className="w-popup min-h-[300px] max-h-popup flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white">TabFlow</h1>
          </div>
          <span className="text-xs text-white/60">{sessions.length} sessions</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        {/* Action Bar */}
        <div className="mb-4">
          <ActionBar
            onSave={handleSaveClick}
            onUndo={handleUndo}
            saving={saving}
            undoing={undoing}
            canUndo={undoCount > 0}
          />
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Session List */}
        {loading ? (
          <LoadingState count={2} />
        ) : fetchError ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600">{fetchError}</p>
            <button
              onClick={refetch}
              className="mt-2 text-sm text-primary-600 hover:underline"
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

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-2 text-xs text-gray-400 text-center flex-shrink-0">
        <span>TabFlow v0.1.0</span>
        <span className="mx-2">·</span>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-primary-600 hover:underline"
        >
          Settings
        </button>
      </footer>

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteSessionId}
        title="Delete Session?"
        message={`"${sessionToDelete?.name || "Session"}" and all its tabs will be permanently deleted. You can undo this action.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
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
