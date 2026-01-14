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

export const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, ERROR_TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white dark:bg-surface-800 border border-rose-100 dark:border-rose-900/30 shadow-lg rounded-xl px-4 py-3 flex items-start gap-3">
        {/* Icon - soft warning */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-5 h-5 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-rose-500 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <p className="flex-1 text-sm text-stone-700 dark:text-stone-200 leading-relaxed">{message}</p>

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

export default ErrorToast;
