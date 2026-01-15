/**
 * TabFlow – AI Tab Grouping Preview Modal
 *
 * Shows AI-suggested tab groupings before applying.
 * Users can:
 * - Preview groups
 * - Rename groups
 * - Cancel without changes
 * - Apply the grouping
 *
 * Safety:
 * - Nothing is saved until user explicitly confirms
 * - AI never runs automatically
 * - User remains in control
 */

import React, { useState, useEffect } from "react";
import { MAX_TABS_FOR_AI_GROUPING } from "@shared/constants";
import {
  suggestTabGroups,
  AIQuotaExceededError,
  type AITabInput,
  type AIGroupResult,
} from "../../ai/aiClient";
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

interface AIGroupingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (groups: AIGroupResult[]) => void;
  tabs: AITabInput[];
}

type ModalState = "loading" | "preview" | "error" | "quota_exceeded";

export const AIGroupingModal: React.FC<AIGroupingModalProps> = ({
  isOpen,
  onClose,
  onApply,
  tabs,
}) => {
  const [state, setState] = useState<ModalState>("loading");
  const [groups, setGroups] = useState<AIGroupResult[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Check if we can use AI grouping
  const canUseAI = tabs.length > 0 && tabs.length <= MAX_TABS_FOR_AI_GROUPING;

  // Fetch AI grouping when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setState("loading");
    setGroups([]);
    setEditingIndex(null);
    setErrorMessage("");

    // Check tab count
    if (!canUseAI) {
      setState("error");
      setErrorMessage(
        tabs.length === 0 ? "No tabs to group" : `Too many tabs (max ${MAX_TABS_FOR_AI_GROUPING})`
      );
      return;
    }

    // Fetch AI grouping
    const fetchGrouping = async () => {
      try {
        const result = await suggestTabGroups(tabs);
        setGroups(result.groups);
        setState("preview");
      } catch (error) {
        if (error instanceof AIQuotaExceededError) {
          setState("quota_exceeded");
        } else {
          setState("error");
          setErrorMessage("Could not generate grouping. Please try later.");
        }
      }
    };

    fetchGrouping();
  }, [isOpen, tabs, canUseAI]);

  // Handle group name edit
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(groups[index].name);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const trimmed = editValue.trim();
    if (trimmed && trimmed !== groups[editingIndex].name) {
      const newGroups = [...groups];
      newGroups[editingIndex] = { ...newGroups[editingIndex], name: trimmed };
      setGroups(newGroups);
    }
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  // Handle apply
  const handleApply = () => {
    onApply(groups);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && state !== "loading" && onClose()}>
      <AlertDialogContent className="max-w-[380px]">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>
            {state === "loading"
              ? "Organizing your tabs…"
              : state === "preview"
                ? "Suggested grouping"
                : "Cannot group tabs"}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            AI-suggested tab grouping preview
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Loading State */}
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-8">
            <svg className="h-8 w-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
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
            <p className="mt-3 text-sm text-muted-foreground">
              AI is analyzing {tabs.length} tabs…
            </p>
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <svg
                className="h-6 w-6 text-rose-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        )}

        {/* Quota Exceeded State */}
        {state === "quota_exceeded" && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <svg
                className="h-6 w-6 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              AI suggestion limit reached.
              <br />
              Resets in 7 days.
            </p>
          </div>
        )}

        {/* Preview State */}
        {state === "preview" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Click a group name to rename it. Apply when ready.
            </p>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-stone-100 bg-stone-50 p-3 dark:border-surface-700 dark:bg-surface-800">
              {groups.map((group, index) => (
                <div key={index} className="rounded-lg bg-white p-2.5 dark:bg-surface-850">
                  {editingIndex === index ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        autoFocus
                        className="flex-1 rounded border border-primary-300 bg-white px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-primary-700 dark:bg-surface-800"
                      />
                    </div>
                  ) : (
                    <button onClick={() => handleStartEdit(index)} className="w-full text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{group.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {group.tabIndexes.length} tab{group.tabIndexes.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={state === "loading"}>
            Cancel
          </AlertDialogCancel>
          {state === "preview" && (
            <AlertDialogAction
              onClick={handleApply}
              className="bg-primary-500 text-white hover:bg-primary-600"
            >
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Apply Grouping
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AIGroupingModal;
