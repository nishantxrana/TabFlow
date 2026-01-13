/**
 * TabFlow – Loading State Component
 *
 * Skeleton UI shown while data is loading.
 */

import React from "react";

interface LoadingStateProps {
  count?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ count = 3 }) => {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-850 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 bg-gray-100 dark:bg-surface-700 rounded" />
            <div className="flex-1">
              <div className="h-3.5 bg-gray-100 dark:bg-surface-700 rounded w-28 mb-1.5" />
              <div className="h-2.5 bg-gray-50 dark:bg-surface-800 rounded w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingState;
