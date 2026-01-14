/**
 * TabFlow – Success Toast Component
 *
 * Design philosophy:
 * - Confirmations should feel warm and reassuring
 * - Quick to appear, gentle to fade
 * - Non-intrusive but visible
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
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white dark:bg-surface-800 border border-primary-100 dark:border-primary-900/30 shadow-lg rounded-xl px-4 py-3 flex items-center gap-3">
        {/* Icon - warm success */}
        <div className="flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <svg className="w-3 h-3 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <p className="flex-1 text-sm text-stone-700 dark:text-stone-200">{message}</p>

        {/* Dismiss - gentle */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 -mr-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors duration-200"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SuccessToast;
