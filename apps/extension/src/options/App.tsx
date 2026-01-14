/**
 * TabFlow – Options Page Root Component
 *
 * Settings, backup, and data management UI.
 * All Chrome API calls go through the background service worker.
 */

import React, { useState, useCallback, useRef } from "react";
import { MessageAction } from "@shared/messages";
import { sendMessage } from "./hooks/useMessage";
import { useSettings } from "./hooks/useSettings";
import { Toggle, Toast, ConfirmDialog } from "./components";
import {
  Button,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@shared/components/ui";

// Cloud sync status type
type CloudSyncStatus =
  | "idle"
  | "authenticating"
  | "uploading"
  | "downloading"
  | "success"
  | "error";

const App: React.FC = () => {
  // Settings from hook
  const { settings, tier, loading, updateSettings } = useSettings();

  // UI state
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Cloud sync state
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Restore preview state (held in memory until confirmed)
  const [restorePreview, setRestorePreview] = useState<{
    sessionCount: number;
    totalTabs: number;
    lastSyncedAt: string;
    sessionsJson: string;
  } | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle auto-backup toggle
  const handleAutoBackupToggle = useCallback(
    async (enabled: boolean) => {
      try {
        await updateSettings({ autoBackup: enabled });
        setToast({
          message: enabled ? "Auto-backup enabled" : "Auto-backup disabled",
          type: "success",
        });
      } catch {
        setToast({ message: "Failed to update settings", type: "error" });
      }
    },
    [updateSettings]
  );

  // Handle backup frequency change
  const handleFrequencyChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const hours = parseInt(e.target.value, 10);
      try {
        await updateSettings({ backupFrequencyHours: hours });
        setToast({ message: "Backup frequency updated", type: "success" });
      } catch {
        setToast({ message: "Failed to update settings", type: "error" });
      }
    },
    [updateSettings]
  );

  // Handle export
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const json = await sendMessage(MessageAction.EXPORT_DATA);

      // Create and download file
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tabflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({ message: "Data exported successfully", type: "success" });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Export failed",
        type: "error",
      });
    } finally {
      setExporting(false);
    }
  }, []);

  // Handle import file selection
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input for re-selection
    e.target.value = "";

    // Validate file type
    if (!file.name.endsWith(".json")) {
      setToast({ message: "Please select a JSON file", type: "error" });
      return;
    }

    setImporting(true);
    try {
      // Read file content
      const json = await file.text();

      // Send to background for import
      const result = await sendMessage(MessageAction.IMPORT_DATA, { json });

      setToast({
        message: `Imported ${result.sessionsImported} session${
          result.sessionsImported !== 1 ? "s" : ""
        }`,
        type: "success",
      });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Import failed",
        type: "error",
      });
    } finally {
      setImporting(false);
    }
  }, []);

  // Handle clear data
  const handleClearClick = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleClearConfirm = useCallback(async () => {
    setClearing(true);
    try {
      await sendMessage(MessageAction.CLEAR_DATA);
      setShowClearConfirm(false);
      setToast({
        message: "All data cleared. You can undo this in the popup.",
        type: "success",
      });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to clear data",
        type: "error",
      });
    } finally {
      setClearing(false);
    }
  }, []);

  // Handle cloud upload
  const handleCloudUpload = useCallback(async () => {
    setCloudSyncStatus("authenticating");
    try {
      setCloudSyncStatus("uploading");
      const result = await sendMessage(MessageAction.CLOUD_UPLOAD);
      setLastSyncedAt(result.syncedAt);
      setCloudSyncStatus("success");
      setToast({ message: "Uploaded to cloud successfully", type: "success" });

      // Reset status after a delay
      setTimeout(() => setCloudSyncStatus("idle"), 3000);
    } catch (err) {
      setCloudSyncStatus("error");
      const message = err instanceof Error ? err.message : "Upload failed";
      // Check if it's an auth-related error
      const isAuthError =
        message.includes("Sign-in") ||
        message.includes("cancelled") ||
        message.includes("Session expired") ||
        message.includes("Authentication");
      setToast({
        message: isAuthError ? message : "Upload failed. Please try again.",
        type: "error",
      });

      // Reset status after a delay
      setTimeout(() => setCloudSyncStatus("idle"), 3000);
    }
  }, []);

  // Handle cloud download preview (first step - fetch and preview only)
  const handleCloudDownloadPreview = useCallback(async () => {
    setCloudSyncStatus("authenticating");
    try {
      setCloudSyncStatus("downloading");
      const result = await sendMessage(MessageAction.CLOUD_DOWNLOAD_PREVIEW);

      if (!result.found) {
        setCloudSyncStatus("idle");
        setToast({ message: "No cloud backup found", type: "error" });
        return;
      }

      // Data found - show preview dialog (DO NOT apply yet)
      setRestorePreview(result.preview!);
      setShowRestoreConfirm(true);
      setCloudSyncStatus("idle");
    } catch (err) {
      setCloudSyncStatus("error");
      const message = err instanceof Error ? err.message : "Download failed";
      // Check if it's an auth-related error
      const isAuthError =
        message.includes("Sign-in") ||
        message.includes("cancelled") ||
        message.includes("Session expired") ||
        message.includes("Authentication");
      setToast({
        message: isAuthError ? message : "Download failed. Please try again.",
        type: "error",
      });

      // Reset status after a delay
      setTimeout(() => setCloudSyncStatus("idle"), 3000);
    }
  }, []);

  // Handle restore confirmation (apply the previewed data)
  const handleRestoreConfirm = useCallback(async () => {
    if (!restorePreview) {
      setShowRestoreConfirm(false);
      return;
    }

    setCloudSyncStatus("downloading");
    try {
      const result = await sendMessage(MessageAction.CLOUD_APPLY_RESTORE, {
        sessionsJson: restorePreview.sessionsJson,
      });

      setLastSyncedAt(restorePreview.lastSyncedAt);
      setCloudSyncStatus("success");
      setToast({
        message: `Restored ${result.sessionsRestored} sessions from cloud`,
        type: "success",
      });

      // Reset status after a delay
      setTimeout(() => setCloudSyncStatus("idle"), 3000);
    } catch (err) {
      setCloudSyncStatus("error");
      const message = err instanceof Error ? err.message : "Restore failed";
      setToast({
        message,
        type: "error",
      });

      // Reset status after a delay
      setTimeout(() => setCloudSyncStatus("idle"), 3000);
    } finally {
      // Clear preview and close dialog
      setRestorePreview(null);
      setShowRestoreConfirm(false);
    }
  }, [restorePreview]);

  // Cancel restore - clear preview data
  const handleRestoreCancel = useCallback(() => {
    setRestorePreview(null);
    setShowRestoreConfirm(false);
  }, []);

  // Prompt for restore - fetch preview first
  const handleRestoreClick = useCallback(() => {
    handleCloudDownloadPreview();
  }, [handleCloudDownloadPreview]);

  // Tier display
  const tierLabel = tier === "pro" ? "Pro" : "Free";
  const tierBadgeClass =
    tier === "pro"
      ? "bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300"
      : "bg-stone-100 dark:bg-surface-700 text-stone-700 dark:text-stone-300";

  // Helper to get human-friendly sync status
  const getSyncStatusText = () => {
    switch (cloudSyncStatus) {
      case "idle":
        return lastSyncedAt
          ? `Last synced ${new Date(lastSyncedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
          : "Ready to sync";
      case "authenticating":
        return "Signing in…";
      case "uploading":
        return "Uploading…";
      case "downloading":
        return "Restoring…";
      case "success":
        return "Sync complete";
      case "error":
        return "Sync failed";
      default:
        return "Ready to sync";
    }
  };

  const getSyncStatusColor = () => {
    switch (cloudSyncStatus) {
      case "idle":
        return "bg-stone-400 dark:bg-stone-600";
      case "authenticating":
      case "uploading":
      case "downloading":
        return "bg-amber-400 dark:bg-amber-500 animate-pulse";
      case "success":
        return "bg-primary-500 dark:bg-primary-400";
      case "error":
        return "bg-rose-500 dark:bg-rose-400";
      default:
        return "bg-stone-400 dark:bg-stone-600";
    }
  };

  const isSyncing =
    cloudSyncStatus === "authenticating" ||
    cloudSyncStatus === "uploading" ||
    cloudSyncStatus === "downloading";

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header - warm, grounding */}
      <header className="border-b border-stone-100 bg-white px-6 py-5 dark:border-surface-800 dark:bg-surface-850">
        <div className="mx-auto max-w-lg">
          <h1 className="text-base font-medium text-stone-800 dark:text-stone-100">Settings</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Manage your backups and data
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-lg space-y-6 px-6 py-6">
        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-16 rounded-lg border border-gray-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-850" />
            <div className="h-40 rounded-lg border border-gray-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-850" />
            <div className="h-28 rounded-lg border border-gray-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-850" />
            <div className="h-24 rounded-lg border border-gray-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-850" />
          </div>
        ) : (
          <>
            {/* Plan Display */}
            <section className="rounded-lg border border-gray-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-850">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current plan</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {tier === "pro" ? "Pro – Unlimited tabs" : "Free – Up to 100 tabs"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${tierBadgeClass}`}
                >
                  {tierLabel}
                </span>
              </div>
            </section>

            {/* Cloud Sync - Focal point */}
            <section className="rounded-lg border border-gray-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-850">
              <div className="mb-5">
                <h2 className="text-sm font-medium text-gray-800 dark:text-gray-100">Cloud Sync</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your sessions are encrypted before leaving your device
                </p>
              </div>

              {/* Sync Status */}
              <div className="mb-5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${getSyncStatusColor()}`} />
                <span>{getSyncStatusText()}</span>
              </div>

              {/* Sync Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCloudUpload}
                  disabled={isSyncing}
                  className="flex-1 bg-primary-500 text-white hover:bg-primary-600"
                >
                  {cloudSyncStatus === "uploading" || cloudSyncStatus === "authenticating" ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span>
                        {cloudSyncStatus === "authenticating" ? "Signing in…" : "Uploading…"}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span>Upload to Cloud</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRestoreClick}
                  disabled={isSyncing}
                  className="flex-1"
                >
                  {cloudSyncStatus === "downloading" ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span>Restoring…</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                        />
                      </svg>
                      <span>Restore from Cloud</span>
                    </>
                  )}
                </Button>
              </div>
            </section>

            {/* Local Backup */}
            <section className="rounded-lg border border-gray-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-850">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                Local Backup
              </h2>

              {/* Auto Backup Toggle */}
              <div className="flex items-center justify-between border-b border-gray-50 py-2.5 dark:border-surface-700">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-200">Auto backup</p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    Save sessions periodically
                  </p>
                </div>
                <Toggle
                  enabled={settings.autoBackup}
                  onChange={handleAutoBackupToggle}
                  label="Toggle auto backup"
                />
              </div>

              {/* Backup Frequency */}
              <div className="flex items-center justify-between py-2.5">
                <p className="text-sm text-gray-700 dark:text-gray-200">Frequency</p>
                <select
                  value={settings.backupFrequencyHours}
                  onChange={handleFrequencyChange}
                  disabled={!settings.autoBackup}
                  className="dark:border-surface-600 rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-600 transition-colors focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-100 disabled:bg-gray-50 disabled:opacity-40 dark:bg-surface-800 dark:text-gray-300 dark:focus:border-primary-500 dark:focus:ring-primary-900 dark:disabled:bg-surface-700"
                >
                  <option value={1}>Every hour</option>
                  <option value={6}>Every 6 hours</option>
                  <option value={12}>Every 12 hours</option>
                  <option value={24}>Every 24 hours</option>
                </select>
              </div>
            </section>

            {/* Data Management */}
            <section className="rounded-lg border border-gray-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-850">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">Data</h2>

              {/* Export / Import row */}
              <div className="flex items-center justify-between border-b border-border/50 py-2.5">
                <p className="text-sm text-foreground">Export or import</p>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportClick}
                    disabled={importing}
                  >
                    {importing ? (
                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                    )}
                    <span>Import</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExport}
                    disabled={exporting}
                    className="bg-primary-500 text-white hover:bg-primary-600"
                  >
                    {exporting ? (
                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    )}
                    <span>Export</span>
                  </Button>
                </div>
              </div>

              {/* Reset Data - Isolated, low emphasis */}
              <div className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-foreground">Delete all sessions</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">This can be undone</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearClick}
                  disabled={clearing}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Reset data
                </Button>
              </div>
            </section>

            {/* Footer */}
            <footer className="pb-6 pt-2 text-center">
              <p className="text-xs text-gray-300 dark:text-gray-600">TabFlow v0.1.1</p>
            </footer>
          </>
        )}
      </main>

      {/* Restore Confirmation Dialog - using shadcn AlertDialog */}
      <AlertDialog
        open={showRestoreConfirm && restorePreview !== null}
        onOpenChange={(open) => !open && cloudSyncStatus !== "downloading" && handleRestoreCancel()}
      >
        <AlertDialogContent className="max-w-[360px]">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>Restore from cloud?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Preview and confirm restoration of cloud backup
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Preview Card */}
          {restorePreview && (
            <div className="space-y-1 rounded-xl bg-secondary p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Sessions</span>
                <span className="font-medium text-foreground">{restorePreview.sessionCount}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Tabs</span>
                <span className="font-medium text-foreground">{restorePreview.totalTabs}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Synced</span>
                <span className="font-medium text-foreground">
                  {new Date(restorePreview.lastSyncedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            This will replace your local sessions. You can undo afterward.
          </p>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={cloudSyncStatus === "downloading"}
              onClick={handleRestoreCancel}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cloudSyncStatus === "downloading"}
              onClick={handleRestoreConfirm}
              className="bg-primary-500 text-white hover:bg-primary-600"
            >
              {cloudSyncStatus === "downloading" && (
                <svg className="mr-1.5 h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Reset All Data?"
        message="This will delete all your saved sessions. You can undo this action from the popup immediately after."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
        loading={clearing}
      />

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
};

export default App;
