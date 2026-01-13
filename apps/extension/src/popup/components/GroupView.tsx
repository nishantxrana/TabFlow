/**
 * TabFlow – Group View Component
 *
 * Displays tabs within a group.
 * Design: Reduced visual noise, tighter line-height,
 * tabs feel like content not clutter.
 */

import React from "react";
import type { Group } from "@shared/types";
import TabItem from "./TabItem";

interface GroupViewProps {
  group: Group;
  searchQuery?: string;
}

export const GroupView: React.FC<GroupViewProps> = ({ group, searchQuery = "" }) => {
  // Filter tabs by search query
  const filteredTabs = searchQuery
    ? group.tabs.filter(
        (tab) =>
          tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tab.domain.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : group.tabs;

  if (filteredTabs.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      {/* Group Header - Minimal */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{group.name}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {filteredTabs.length}
        </span>
      </div>

      {/* Tabs List - Tight, clean */}
      <div className="space-y-px ml-0.5 pl-2 border-l border-gray-100 dark:border-surface-700">
        {filteredTabs.map((tab, index) => (
          <TabItem
            key={`${tab.url}-${index}`}
            tab={tab}
            highlighted={!!searchQuery}
          />
        ))}
      </div>
    </div>
  );
};

export default GroupView;
