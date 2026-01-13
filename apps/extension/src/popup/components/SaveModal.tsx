/**
 * TabFlow – Save Session Modal
 *
 * Modal dialog for naming a session before saving.
 */

import React, { useState, useRef, useEffect } from "react";

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  saving: boolean;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  saving,
}) => {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(`Session ${new Date().toLocaleString()}`);
      // Delay focus to ensure modal is mounted
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !saving) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !saving) {
      onSave(name.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/50 animate-fade-in"
        onClick={saving ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative w-[90%] max-w-[320px] bg-white dark:bg-surface-850 rounded-lg shadow-xl dark:shadow-2xl animate-scale-in border border-gray-200 dark:border-surface-700">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-4 pt-4 pb-1">
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">Save Session</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Name your session to find it later
            </p>
          </div>

          {/* Input */}
          <div className="px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              placeholder="Session name…"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-surface-600 rounded-md bg-white dark:bg-surface-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 disabled:bg-gray-50 dark:disabled:bg-surface-700 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-surface-700 rounded-md hover:bg-gray-200 dark:hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 rounded-md hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveModal;
