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
    <div className="animate-slide-up fixed bottom-4 left-4 right-4 z-50">
      <div className="flex items-center gap-3 rounded-xl border border-primary-100 bg-white px-4 py-3 shadow-lg dark:border-primary-900/30 dark:bg-surface-800">
        {/* Icon - warm success */}
        <div className="flex-shrink-0">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
            <svg
              className="h-3 w-3 text-primary-600 dark:text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <p className="flex-1 text-sm text-stone-700 dark:text-stone-200">{message}</p>

        {/* Dismiss - gentle */}
        <button
          onClick={onDismiss}
          className="-mr-1 flex-shrink-0 p-1 text-stone-400 transition-colors duration-200 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
          aria-label="Dismiss"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SuccessToast;
