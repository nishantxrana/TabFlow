/**
 * TabFlow – Action Bar Component
 *
 * Design philosophy:
 * - Primary action should invite, not demand
 * - Button should feel warm and confident
 * - Secondary action should be available but quiet
 * 
 * Uses shadcn/ui Button for consistency and polish.
 */

import React from "react";
import { Button } from "@shared/components/ui";

interface ActionBarProps {
  onSave: () => void;
  onUndo: () => void;
  saving: boolean;
  undoing: boolean;
  canUndo: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onSave,
  onUndo,
  saving,
  undoing,
  canUndo,
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Save Session - Warm, inviting primary action */}
      <Button
        onClick={onSave}
        disabled={saving}
        className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2.5"
      >
        {saving ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Saving…</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Save Session</span>
          </>
        )}
      </Button>

      {/* Undo - Quiet, supportive secondary action */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onUndo}
        disabled={undoing || !canUndo}
        title={canUndo ? "Undo last action" : "Nothing to undo"}
        className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
        aria-label="Undo"
      >
        {undoing ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        )}
      </Button>
    </div>
  );
};

export default ActionBar;
