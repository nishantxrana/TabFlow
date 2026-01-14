/**
 * TabFlow – Action Bar Component
 *
 * Design philosophy:
 * - Primary action should invite, not demand
 * - Button should feel warm and confident
 * - Secondary action should be available but quiet
 */

import React from "react";

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
      <button
        onClick={onSave}
        disabled={saving}
        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary-500 to-primary-600 dark:from-primary-500 dark:to-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:from-primary-600 hover:to-primary-700 dark:hover:from-primary-600 dark:hover:to-primary-700 disabled:opacity-50 transition-all duration-200"
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
      </button>

      {/* Undo - Quiet, supportive secondary action */}
      <button
        onClick={onUndo}
        disabled={undoing || !canUndo}
        title={canUndo ? "Undo last action" : "Nothing to undo"}
        className="p-2.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-all duration-200"
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
      </button>
    </div>
  );
};

export default ActionBar;
