/**
 * TabFlow – Save Session Modal
 *
 * Design philosophy:
 * - Modal should feel like a friendly helper
 * - Input should feel comfortable and welcoming
 * - Actions should guide without pressure
 * - AI suggestions are optional and transparent
 *
 * Uses shadcn/ui AlertDialog for accessibility and polish.
 */

import React, { useState, useRef, useEffect } from "react";
import { MAX_SESSION_NAME_LENGTH, MAX_TABS_FOR_AI_NAMING } from "@shared/constants";
import { suggestSessionName, AIQuotaExceededError, type AITabInput } from "../../ai/aiClient";
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
  /** Current tabs for AI naming suggestion */
  tabs?: AITabInput[];
}

export const SaveModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  saving,
  tabs = [],
}) => {
  const [name, setName] = useState("");
  const [showLimitHint, setShowLimitHint] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuotaExceeded, setAiQuotaExceeded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if AI is available (has tabs and not exceeded quota)
  const canUseAI = tabs.length > 0 && tabs.length <= MAX_TABS_FOR_AI_NAMING && !aiQuotaExceeded;

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
      setAiError(null);
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
    // Clear AI error when user types
    setAiError(null);
  };

  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0 && trimmedName.length <= MAX_SESSION_NAME_LENGTH;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isValid && !saving && !aiLoading) {
      onSave(trimmedName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid && !saving && !aiLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle AI suggestion request
  const handleAISuggest = async () => {
    if (!canUseAI || aiLoading) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const result = await suggestSessionName(tabs);
      // Insert suggestion into input (user can still edit)
      setName(result.suggestedName);
      setShowLimitHint(false);
      // Focus input so user can edit
      inputRef.current?.focus();
      inputRef.current?.select();
    } catch (error) {
      if (error instanceof AIQuotaExceededError) {
        setAiQuotaExceeded(true);
        setAiError("AI limit reached (resets weekly)");
      } else {
        setAiError("Could not generate suggestion");
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Tooltip text for AI button
  const aiButtonTooltip = aiQuotaExceeded
    ? "AI suggestion limit reached (resets in 7 days)"
    : tabs.length > MAX_TABS_FOR_AI_NAMING
      ? `Too many tabs (max ${MAX_TABS_FOR_AI_NAMING})`
      : "Suggest a name based on your tabs";

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !saving && !aiLoading && onClose()}>
      <AlertDialogContent className="max-w-[340px]">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>Save your tabs</AlertDialogTitle>
          <AlertDialogDescription>Give this session a name you'll remember</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Input field with AI button */}
        <div className="py-2">
          <div className="relative flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={saving || aiLoading}
              maxLength={MAX_SESSION_NAME_LENGTH}
              placeholder="Session name…"
              className={`flex-1 rounded-xl border bg-secondary px-4 py-3 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:bg-muted ${
                showLimitHint ? "border-amber-400" : "border-transparent"
              }`}
            />
            {/* AI Suggestion Button */}
            <button
              type="button"
              onClick={handleAISuggest}
              disabled={!canUseAI || aiLoading || saving}
              title={aiButtonTooltip}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                canUseAI && !aiLoading
                  ? "bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 hover:from-amber-200 hover:to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 dark:text-amber-400 dark:hover:from-amber-900/50 dark:hover:to-amber-800/30"
                  : "bg-secondary text-muted-foreground opacity-50"
              } disabled:cursor-not-allowed`}
            >
              {aiLoading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between px-1">
            <span
              className={`text-[10px] transition-opacity ${
                aiError
                  ? "text-rose-500 opacity-100 dark:text-rose-400"
                  : showLimitHint
                    ? "text-amber-600 opacity-100 dark:text-amber-500"
                    : "text-muted-foreground opacity-0"
              }`}
            >
              {aiError || `Maximum ${MAX_SESSION_NAME_LENGTH} characters`}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {name.length}/{MAX_SESSION_NAME_LENGTH}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving || aiLoading} onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={saving || aiLoading || !isValid}
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
