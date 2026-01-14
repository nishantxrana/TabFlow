/**
 * TabFlow – Toast Component for Options Page
 *
 * Design philosophy:
 * - Toasts should feel helpful and reassuring
 * - Non-intrusive but visible
 * - Warm success, gentle error
 */

import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onDismiss,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  const borderColor =
    type === "success"
      ? "border-primary-100 dark:border-primary-900/30"
      : "border-rose-100 dark:border-rose-900/30";
  const iconBgColor =
    type === "success"
      ? "bg-primary-50 dark:bg-primary-900/20"
      : "bg-rose-50 dark:bg-rose-900/15";
  const iconColor =
    type === "success"
      ? "text-primary-600 dark:text-primary-400"
      : "text-rose-500 dark:text-rose-400";

  const icon =
    type === "success" ? (
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg
        className="w-3 h-3"
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
    );

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div
        className={`bg-white dark:bg-surface-800 border ${borderColor} shadow-lg rounded-xl px-4 py-3 flex items-center gap-3 max-w-sm`}
      >
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-5 h-5 rounded-full ${iconBgColor} flex items-center justify-center`}
        >
          <span className={iconColor}>{icon}</span>
        </div>

        {/* Message */}
        <p className="flex-1 text-sm text-stone-700 dark:text-stone-200">
          {message}
        </p>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 -mr-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors duration-200"
          aria-label="Dismiss"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
