/**
 * TabFlow – Loading State Component
 *
 * Design philosophy:
 * - Loading should feel calm and patient
 * - Soft pulsing animation, not jarring
 */

import React from "react";

interface LoadingStateProps {
  count?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ count = 3 }) => {
  return (
    <div className="animate-pulse space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-stone-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-850"
        >
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-lg bg-stone-100 dark:bg-surface-700" />
            <div className="flex-1">
              <div className="mb-2 h-4 w-32 rounded-lg bg-stone-100 dark:bg-surface-700" />
              <div className="h-3 w-24 rounded-lg bg-stone-50 dark:bg-surface-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingState;
