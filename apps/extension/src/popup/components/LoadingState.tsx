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
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-stone-100 dark:border-surface-800 bg-white dark:bg-surface-850 p-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-stone-100 dark:bg-surface-700 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-stone-100 dark:bg-surface-700 rounded-lg w-32 mb-2" />
              <div className="h-3 bg-stone-50 dark:bg-surface-800 rounded-lg w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingState;
