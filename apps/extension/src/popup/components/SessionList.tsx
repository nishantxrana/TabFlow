/**
 * TabFlow – Session List Component
 *
 * Design philosophy:
 * - Empty states should feel hopeful, not sad
 * - The list should feel like a safe place for your tabs
 * - Adequate spacing so sessions don't feel cramped
 */

import React from "react";
import type { Session } from "@shared/types";
import SessionCard from "./SessionCard";

interface SessionListProps {
  sessions: Session[];
  searchQuery?: string;
  onRestore: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onRename: (sessionId: string, newName: string) => void;
  onCopyLinks: (session: Session) => void;
  restoringId: string | null;
  deletingId: string | null;
  renamingId: string | null;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  searchQuery = "",
  onRestore,
  onDelete,
  onRename,
  onCopyLinks,
  restoringId,
  deletingId,
  renamingId,
}) => {
  // Filter sessions by search query
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

  // Empty state - hopeful, not sad
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 dark:from-surface-800 dark:to-surface-850 flex items-center justify-center">
          <svg className="w-6 h-6 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">Ready when you are</p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 max-w-[200px] mx-auto">
          Save your open tabs to keep them safe for later
        </p>
      </div>
    );
  }

  // No search results
  if (filteredSessions.length === 0 && searchQuery) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          No matches for "{searchQuery}"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {filteredSessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          searchQuery={searchQuery}
          onRestore={onRestore}
          onDelete={onDelete}
          onRename={onRename}
          onCopyLinks={onCopyLinks}
          restoring={restoringId === session.id}
          deleting={deletingId === session.id}
          renaming={renamingId === session.id}
        />
      ))}
    </div>
  );
};

export default SessionList;
