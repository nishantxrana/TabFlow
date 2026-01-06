/**
 * TabFlow – Group View Component
 *
 * Displays tabs within a group.
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
      {/* Group Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-gray-500">{group.name}</span>
        <span className="text-[10px] text-gray-400">
          {filteredTabs.length} tab{filteredTabs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tabs List */}
      <div className="space-y-0.5 ml-1 border-l-2 border-gray-100 pl-2">
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

