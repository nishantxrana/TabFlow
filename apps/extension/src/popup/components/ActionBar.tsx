/**
 * TabFlow – Action Bar Component
 *
 * Primary actions: Save Session, Undo
 * Design: Primary action is prominent, secondary is subdued
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
    <div className="flex gap-2">
      {/* Save Session - Primary Action */}
      <button
        onClick={onSave}
        disabled={saving}
        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 hover:shadow disabled:opacity-50 disabled:shadow-none transition-all"
      >
        {saving ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
            <span>Saving…</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <span>Save Session</span>
          </>
        )}
      </button>

      {/* Undo - Secondary Action */}
      <button
        onClick={onUndo}
        disabled={undoing || !canUndo}
        title={canUndo ? "Undo last action" : "Nothing to undo"}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:bg-gray-50 disabled:border-gray-200 transition-all"
      >
        {undoing ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        )}
        <span>Undo</span>
      </button>
    </div>
  );
};

export default ActionBar;
