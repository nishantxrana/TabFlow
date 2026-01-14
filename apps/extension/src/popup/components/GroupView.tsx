/**
 * TabFlow – Group View Component
 *
 * Design philosophy:
 * - Tab lists should feel like organized content, not clutter
 * - Subtle visual hierarchy without sharp contrasts
 * - Comfortable spacing for readability
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
    <div className="mt-3">
      {/* Group Header - subtle, not demanding */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">{group.name}</span>
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          {filteredTabs.length}
        </span>
      </div>

      {/* Tabs List - organized, calm */}
      <div className="space-y-0.5 ml-0.5 pl-2.5 border-l-2 border-stone-100 dark:border-surface-700">
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
