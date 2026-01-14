/**
 * TabFlow – Save Session Modal
 *
 * Design philosophy:
 * - Modal should feel like a friendly helper
 * - Input should feel comfortable and welcoming
 * - Actions should guide without pressure
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - soft, not harsh */}
      <div
        className="absolute inset-0 bg-stone-900/20 dark:bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={saving ? undefined : onClose}
      />

      {/* Modal - warm, inviting */}
      <div className="relative w-full max-w-[340px] bg-white dark:bg-surface-850 rounded-2xl shadow-xl dark:shadow-2xl animate-scale-in overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Header - friendly, encouraging */}
          <div className="px-5 pt-5 pb-1">
            <h2 className="text-base font-medium text-stone-800 dark:text-stone-100">
              Save your tabs
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Give this session a name you'll remember
            </p>
          </div>

          {/* Input - comfortable, spacious */}
          <div className="px-5 py-4">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              placeholder="Session name…"
              className="w-full px-4 py-3 text-sm border-0 rounded-xl bg-stone-50 dark:bg-surface-800 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:focus:ring-primary-400/30 disabled:bg-stone-100 dark:disabled:bg-surface-700 disabled:cursor-not-allowed transition-all duration-200"
            />
          </div>

          {/* Actions - balanced, calm */}
          <div className="px-5 pb-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-surface-700 rounded-xl hover:bg-stone-200 dark:hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-b from-primary-500 to-primary-600 rounded-xl hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
