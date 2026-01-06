/**
 * TabFlow – Session List Component
 *
 * Displays list of sessions with empty state.
 */

import React from "react";
import type { Session } from "@shared/types";
import SessionCard from "./SessionCard";

interface SessionListProps {
  sessions: Session[];
  searchQuery?: string;
  onRestore: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  restoringId: string | null;
  deletingId: string | null;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  searchQuery = "",
  onRestore,
  onDelete,
  restoringId,
  deletingId,
}) => {
  // Filter sessions by search query (check if any tabs match)
  const filteredSessions = searchQuery
    ? sessions.filter((session) =>
        session.groups.some((group) =>
          group.tabs.some(
            (tab) =>
              tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              tab.domain.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
      )
    : sessions;

  // Empty state
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">No saved sessions</h3>
        <p className="text-xs text-gray-500 max-w-[200px] mx-auto">
          Click "Save Session" to capture your current tabs.
        </p>
      </div>
    );
  }

  // No results for search
  if (filteredSessions.length === 0 && searchQuery) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500">
          No tabs match "<span className="font-medium">{searchQuery}</span>"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredSessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          searchQuery={searchQuery}
          onRestore={onRestore}
          onDelete={onDelete}
          restoring={restoringId === session.id}
          deleting={deletingId === session.id}
        />
      ))}
    </div>
  );
};

export default SessionList;

