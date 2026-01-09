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

// Cloud sync status type
type CloudSyncStatus = "idle" | "authenticating" | "uploading" | "downloading" | "success" | "error";

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
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    []
  );

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
      const isAuthError = message.includes("Sign-in") || 
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
      const isAuthError = message.includes("Sign-in") || 
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
      ? "bg-primary-100 text-primary-800"
      : "bg-gray-100 text-gray-800";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">TabFlow Settings</h1>
            <p className="text-sm text-white/70">Manage your data and preferences</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 h-24" />
            <div className="bg-white rounded-xl shadow-sm p-6 h-48" />
            <div className="bg-white rounded-xl shadow-sm p-6 h-64" />
          </div>
        ) : (
          <>
            {/* Tier Display */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Plan</h2>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${tierBadgeClass}`}
                >
                  {tierLabel} Tier
                </span>
                <span className="text-sm text-gray-500">
                  {tier === "pro" ? "Unlimited tabs" : "Up to 100 saved tabs"}
                </span>
              </div>
            </section>

            {/* Cloud Sync */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Cloud Sync
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Manually sync your sessions to the cloud. Your data is encrypted before upload.
              </p>

              {/* Sync Status */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <div
                  className={`w-2 h-2 rounded-full ${
                    cloudSyncStatus === "idle"
                      ? "bg-gray-400"
                      : cloudSyncStatus === "authenticating"
                      ? "bg-blue-400 animate-pulse"
                      : cloudSyncStatus === "uploading" || cloudSyncStatus === "downloading"
                      ? "bg-yellow-400 animate-pulse"
                      : cloudSyncStatus === "success"
                      ? "bg-green-400"
                      : "bg-red-400"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {cloudSyncStatus === "idle" && "Ready to sync"}
                  {cloudSyncStatus === "authenticating" && "Signing in..."}
                  {cloudSyncStatus === "uploading" && "Uploading..."}
                  {cloudSyncStatus === "downloading" && "Restoring..."}
                  {cloudSyncStatus === "success" && "Sync successful"}
                  {cloudSyncStatus === "error" && "Sync failed"}
                </span>
                {lastSyncedAt && cloudSyncStatus === "idle" && (
                  <span className="text-xs text-gray-400 ml-auto">
                    Last synced: {new Date(lastSyncedAt).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Sync Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCloudUpload}
                  disabled={cloudSyncStatus === "authenticating" || cloudSyncStatus === "uploading" || cloudSyncStatus === "downloading"}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cloudSyncStatus === "authenticating" || cloudSyncStatus === "uploading" ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                      {cloudSyncStatus === "authenticating" ? "Signing in..." : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      Upload to Cloud
                    </>
                  )}
                </button>

                <button
                  onClick={handleRestoreClick}
                  disabled={cloudSyncStatus === "authenticating" || cloudSyncStatus === "uploading" || cloudSyncStatus === "downloading"}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cloudSyncStatus === "authenticating" || cloudSyncStatus === "downloading" ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                      {cloudSyncStatus === "authenticating" ? "Signing in..." : "Restoring..."}
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                        />
                      </svg>
                      Restore from Cloud
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-3">
                ⚠️ Restore will replace all local sessions. You can undo this action.
              </p>
            </section>

            {/* Backup Settings */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Local Backup Settings
              </h2>

              {/* Auto Backup Toggle */}
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Auto Backup</p>
                  <p className="text-sm text-gray-500">
                    Automatically backup your sessions to IndexedDB
                  </p>
                </div>
                <Toggle
                  enabled={settings.autoBackup}
                  onChange={handleAutoBackupToggle}
                  label="Toggle auto backup"
                />
              </div>

              {/* Backup Frequency */}
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Backup Frequency</p>
                  <p className="text-sm text-gray-500">
                    How often to create automatic backups
                  </p>
                </div>
                <select
                  value={settings.backupFrequencyHours}
                  onChange={handleFrequencyChange}
                  disabled={!settings.autoBackup}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value={1}>Every hour</option>
                  <option value={6}>Every 6 hours</option>
                  <option value={12}>Every 12 hours</option>
                  <option value={24}>Every 24 hours</option>
                </select>
              </div>
            </section>

            {/* Data Management */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Data Management
              </h2>

              {/* Export */}
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Export Data</p>
                  <p className="text-sm text-gray-500">
                    Download all sessions as a JSON file
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Export
                    </>
                  )}
                </button>
              </div>

              {/* Import */}
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Import Data</p>
                  <p className="text-sm text-gray-500">
                    Restore sessions from a backup file
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={handleImportClick}
                  disabled={importing}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                      Importing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      Import
                    </>
                  )}
                </button>
              </div>

              {/* Reset Data */}
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Reset Data</p>
                  <p className="text-sm text-gray-500">
                    Delete all sessions. This can be undone.
                  </p>
                </div>
                <button
                  onClick={handleClearClick}
                  disabled={clearing}
                  className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Reset
                </button>
              </div>
            </section>

            {/* About */}
            <section className="text-center py-6">
              <p className="text-sm text-gray-500">TabFlow v0.1.0</p>
              <p className="text-xs text-gray-400 mt-1">
                A local-first, reliability-focused tab manager
              </p>
            </section>
          </>
        )}
      </main>

      {/* Restore from Cloud Confirmation Dialog with Preview */}
      {showRestoreConfirm && restorePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={cloudSyncStatus === "downloading" ? undefined : handleRestoreCancel}
          />

          {/* Dialog */}
          <div className="relative w-[90%] max-w-[420px] bg-white rounded-xl shadow-2xl animate-scale-in">
            {/* Icon + Title */}
            <div className="px-6 pt-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Restore from Cloud?</h2>
            </div>

            {/* Preview Summary */}
            <div className="px-6 py-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Cloud Backup Contents:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sessions</span>
                    <span className="font-medium text-gray-900">{restorePreview.sessionCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Tabs</span>
                    <span className="font-medium text-gray-900">{restorePreview.totalTabs}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Synced</span>
                    <span className="font-medium text-gray-900">
                      {new Date(restorePreview.lastSyncedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                ⚠️ This will replace all your current local sessions. You can undo this action afterward.
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={handleRestoreCancel}
                disabled={cloudSyncStatus === "downloading"}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreConfirm}
                disabled={cloudSyncStatus === "downloading"}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {cloudSyncStatus === "downloading" && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
              </button>
            </div>
          </div>
        </div>
      )}

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
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default App;
