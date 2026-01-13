/**
 * TabFlow – Toast Component for Options Page
 *
 * Displays success/error messages with auto-dismiss.
 * Design: Matches popup toast style - subtle, non-intrusive
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
    type === "success" ? "border-green-200" : "border-red-200";
  const iconBgColor = type === "success" ? "bg-green-100" : "bg-red-100";
  const iconColor = type === "success" ? "text-green-600" : "text-red-600";

  const icon =
    type === "success" ? (
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ) : (
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    );

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        className={`bg-white border ${borderColor} shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 max-w-sm`}
      >
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-5 h-5 rounded-full ${iconBgColor} flex items-center justify-center`}
        >
          <span className={iconColor}>{icon}</span>
        </div>

        {/* Message */}
        <p className="flex-1 text-sm text-gray-700 leading-relaxed">
          {message}
        </p>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 -mr-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
