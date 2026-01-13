/**
 * TabFlow – Toast Component for Options Page
 *
 * Displays success/error messages with auto-dismiss.
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
      ? "border-green-200 dark:border-green-900/50"
      : "border-red-200 dark:border-red-900/50";
  const iconBgColor =
    type === "success"
      ? "bg-green-100 dark:bg-green-900/30"
      : "bg-red-100 dark:bg-red-900/30";
  const iconColor =
    type === "success"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  const icon =
    type === "success" ? (
      <svg
        className="w-2.5 h-2.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg
        className="w-2.5 h-2.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    );

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div
        className={`bg-white dark:bg-surface-800 border ${borderColor} shadow-lg rounded-lg px-3 py-2.5 flex items-center gap-2.5 max-w-xs`}
      >
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-4 h-4 rounded-full ${iconBgColor} flex items-center justify-center`}
        >
          <span className={iconColor}>{icon}</span>
        </div>

        {/* Message */}
        <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">
          {message}
        </p>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-0.5 -mr-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
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
