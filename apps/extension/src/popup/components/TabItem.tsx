/**
 * TabFlow – Tab Item Component
 *
 * Design philosophy:
 * - Individual tabs should feel like valuable content
 * - Readable without being dense
 * - Subtle hover for discoverability
 */

import React from "react";
import type { TabSnapshot } from "@shared/types";

interface TabItemProps {
  tab: TabSnapshot;
  highlighted?: boolean;
}

export const TabItem: React.FC<TabItemProps> = ({ tab, highlighted = false }) => {
  // Default favicon if none available
  const faviconUrl = tab.favicon || `https://www.google.com/s2/favicons?domain=${tab.domain}&sz=32`;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
        highlighted
          ? "bg-amber-50 dark:bg-amber-900/10"
          : "hover:bg-stone-50 dark:hover:bg-surface-800"
      } transition-colors duration-150`}
    >
      {/* Favicon - rounded */}
      <img
        src={faviconUrl}
        alt=""
        className="h-4 w-4 flex-shrink-0 rounded"
        onError={(e) => {
          // Fallback to generic icon on error
          e.currentTarget.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'/%3E%3C/svg%3E";
        }}
      />

      {/* Title and Domain */}
      <div className="min-w-0 flex-1 leading-snug">
        <p className="truncate text-[12px] text-stone-600 dark:text-stone-300" title={tab.title}>
          {tab.title}
        </p>
        <p className="truncate text-[10px] text-stone-400 dark:text-stone-500">{tab.domain}</p>
      </div>
    </div>
  );
};

export default TabItem;
