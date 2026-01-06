/**
 * TabFlow – Session Card Component
 *
 * Displays a single session with expand/collapse for groups.
 */

import React, { useState } from "react";
import type { Session } from "@shared/types";
import GroupView from "./GroupView";

interface SessionCardProps {
  session: Session;
  searchQuery?: string;
  onRestore: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  restoring: boolean;
  deleting: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  searchQuery = "",
  onRestore,
  onDelete,
  restoring,
  deleting,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Calculate total tabs
  const totalTabs = session.groups.reduce((sum, g) => sum + g.tabs.length, 0);

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  // Check if any tabs match search
  const hasMatchingTabs = searchQuery
    ? session.groups.some((group) =>
        group.tabs.some(
          (tab) =>
            tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tab.domain.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : true;

  // Auto-expand if searching and has matches
  const isExpanded = expanded || (searchQuery && hasMatchingTabs);

  if (searchQuery && !hasMatchingTabs) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-sm">
      {/* Session Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Expand/Collapse Icon */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
              isExpanded ? "rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>

          {/* Session Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {session.name}
            </h3>
            <p className="text-xs text-gray-500">
              {totalTabs} tab{totalTabs !== 1 ? "s" : ""} · {formatDate(session.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          {/* Restore Button */}
          <button
            onClick={() => onRestore(session.id)}
            disabled={restoring}
            title="Restore session"
            className="p-1.5 rounded text-primary-600 hover:bg-primary-50 disabled:opacity-50 transition-colors"
          >
            {restoring ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(session.id)}
            disabled={deleting}
            title="Delete session"
            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleting ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {session.groups.map((group) => (
            <GroupView key={group.id} group={group} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionCard;

