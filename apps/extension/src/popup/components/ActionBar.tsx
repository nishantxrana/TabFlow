/**
 * TabFlow – Action Bar Component
 *
 * Primary action: Save Session (compact, prominent)
 * Secondary action: Undo (visually receded)
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
      {/* Save Session - Compact Primary Action */}
      <button
        onClick={onSave}
        disabled={saving}
        className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary-600 dark:bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Saving…</span>
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Save Session</span>
          </>
        )}
      </button>

      {/* Undo - Secondary, lower emphasis */}
      <button
        onClick={onUndo}
        disabled={undoing || !canUndo}
        title={canUndo ? "Undo last action" : "Nothing to undo"}
        className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
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
