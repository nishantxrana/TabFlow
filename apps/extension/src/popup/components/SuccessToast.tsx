/**
 * TabFlow – Success Toast Component
 *
 * Displays success messages with auto-dismiss.
 * Design: Subtle green confirmation, non-intrusive
 */

import React, { useEffect } from "react";

interface SuccessToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  message,
  onDismiss,
  duration = 2500,
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 animate-slide-up">
      <div className="bg-white dark:bg-surface-800 border border-green-200 dark:border-green-900/50 shadow-lg rounded-lg px-3 py-2.5 flex items-center gap-2.5">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">{message}</p>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-0.5 -mr-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SuccessToast;
