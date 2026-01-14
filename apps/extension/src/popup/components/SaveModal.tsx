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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (name.trim() && !saving) {
      onSave(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim() && !saving) {
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
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            placeholder="Session name…"
            className="w-full rounded-xl border-0 bg-secondary px-4 py-3 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:bg-muted"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving} onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={saving || !name.trim()}
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
