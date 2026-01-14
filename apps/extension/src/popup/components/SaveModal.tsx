/**
 * TabFlow – Save Session Modal
 *
 * Design philosophy:
 * - Modal should feel like a friendly helper
 * - Input should feel comfortable and welcoming
 * - Actions should guide without pressure
 *
 * Uses shadcn/ui AlertDialog for accessibility and polish.
 */

import React, { useState, useRef, useEffect } from "react";
import { MAX_SESSION_NAME_LENGTH } from "@shared/constants";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@shared/components/ui";

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  saving: boolean;
}

export const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave, saving }) => {
  const [name, setName] = useState("");
  const [showLimitHint, setShowLimitHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Generate a shorter default name that fits within limit
      const dateStr = new Date().toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      setName(`Session ${dateStr}`);
      setShowLimitHint(false);
      // Delay focus to ensure modal is mounted
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_SESSION_NAME_LENGTH) {
      setName(value);
      setShowLimitHint(false);
    } else {
      // Show hint but cap at max length
      setShowLimitHint(true);
      setName(value.slice(0, MAX_SESSION_NAME_LENGTH));
    }
  };

  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0 && trimmedName.length <= MAX_SESSION_NAME_LENGTH;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isValid && !saving) {
      onSave(trimmedName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid && !saving) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
      <AlertDialogContent className="max-w-[340px]">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>Save your tabs</AlertDialogTitle>
          <AlertDialogDescription>Give this session a name you'll remember</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Input field */}
        <div className="py-2">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={saving}
              maxLength={MAX_SESSION_NAME_LENGTH}
              placeholder="Session name…"
              className={`w-full rounded-xl border bg-secondary px-4 py-3 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:bg-muted ${
                showLimitHint ? "border-amber-400" : "border-transparent"
              }`}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between px-1">
            <span
              className={`text-[10px] transition-opacity ${
                showLimitHint
                  ? "text-amber-600 opacity-100 dark:text-amber-500"
                  : "text-muted-foreground opacity-0"
              }`}
            >
              Maximum {MAX_SESSION_NAME_LENGTH} characters
            </span>
            <span className="text-[10px] text-muted-foreground">
              {name.length}/{MAX_SESSION_NAME_LENGTH}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving} onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={saving || !isValid}
            onClick={() => handleSubmit()}
            className="bg-primary-500 text-white hover:bg-primary-600"
          >
            {saving ? (
              <>
                <svg className="mr-1.5 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                Saving…
              </>
            ) : (
              "Save"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SaveModal;
