/**
 * TabFlow – Confirm Dialog Component
 *
 * Confirmation dialogs should feel reassuring, not alarming.
 * The goal is to help users feel safe making decisions.
 * 
 * Design philosophy:
 * - No scary warning icons
 * - Warm, human language
 * - Cancel/keep actions should feel safe and obvious
 * - Confirm actions should feel confident, not aggressive
 */

import React, { useEffect } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "gentle" | "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}) => {
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  // Gentle styling for all variants - feels calm and trustworthy
  const confirmButtonClass =
    variant === "danger"
      ? "bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-600 text-white"
      : variant === "gentle"
      ? "bg-stone-600 hover:bg-stone-700 dark:bg-stone-500 dark:hover:bg-stone-600 text-white"
      : "bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-600 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - soft, not harsh */}
      <div
        className="absolute inset-0 bg-stone-900/20 dark:bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={loading ? undefined : onCancel}
      />

      {/* Dialog - soft, rounded, grounded */}
      <div className="relative w-full max-w-[320px] bg-white dark:bg-surface-850 rounded-2xl shadow-xl dark:shadow-2xl animate-scale-in overflow-hidden">
        {/* Content */}
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-base font-medium text-stone-800 dark:text-stone-100 text-center">
            {title}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center mt-2 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions - Cancel is prominent and safe, Confirm is confident */}
        <div className="px-5 pb-5 pt-4 flex gap-3">
          {/* Cancel button - large, inviting, safe */}
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-surface-700 rounded-xl hover:bg-stone-200 dark:hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {cancelLabel}
          </button>
          {/* Confirm button - confident but not aggressive */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 ${confirmButtonClass}`}
          >
            {loading && (
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
