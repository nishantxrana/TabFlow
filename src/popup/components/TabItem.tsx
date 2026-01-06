/**
 * TabFlow – Tab Item Component
 *
 * Displays a single tab with favicon, title, and domain.
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
      className={`flex items-center gap-2 py-1.5 px-2 rounded ${
        highlighted ? "bg-yellow-50" : "hover:bg-gray-50"
      } transition-colors`}
    >
      {/* Favicon */}
      <img
        src={faviconUrl}
        alt=""
        className="w-4 h-4 flex-shrink-0"
        onError={(e) => {
          // Fallback to generic icon on error
          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'/%3E%3C/svg%3E";
        }}
      />

      {/* Title and Domain */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-800 truncate" title={tab.title}>
          {tab.title}
        </p>
        <p className="text-[10px] text-gray-400 truncate">{tab.domain}</p>
      </div>
    </div>
  );
};

export default TabItem;

