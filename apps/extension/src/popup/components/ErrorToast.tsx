/**
 * TabFlow – Error Toast Component
 *
 * Design philosophy:
 * - Errors should be informative, not alarming
 * - The user should feel helped, not blamed
 * - Gentle visual treatment, clear message
 */

import React, { useEffect } from "react";
import { ERROR_TOAST_DURATION_MS } from "@shared/constants";

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, ERROR_TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="animate-slide-up fixed bottom-4 left-4 right-4 z-50">
      <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-white px-4 py-3 shadow-lg dark:border-rose-900/30 dark:bg-surface-800">
        {/* Icon - soft warning */}
        <div className="mt-0.5 flex-shrink-0">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/20">
            <svg
              className="h-3 w-3 text-rose-500 dark:text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <p className="flex-1 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
          {message}
        </p>

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

export default ErrorToast;
