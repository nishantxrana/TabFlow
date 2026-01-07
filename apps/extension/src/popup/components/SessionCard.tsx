/**
 * TabFlow – Session Card Component
 *
 * Displays a single session with expand/collapse for groups.
 * Supports inline rename and copy links.
 */

import React, { useState, useRef, useEffect } from "react";
import type { Session } from "@shared/types";
import { MAX_SESSION_NAME_LENGTH } from "@shared/constants";
import GroupView from "./GroupView";

interface SessionCardProps {
  session: Session;
  searchQuery?: string;
  onRestore: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onRename: (sessionId: string, newName: string) => void;
  onCopyLinks: (session: Session) => void;
  restoring: boolean;
  deleting: boolean;
  renaming: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  searchQuery = "",
  onRestore,
  onDelete,
  onRename,
  onCopyLinks,
  restoring,
  deleting,
  renaming,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.name);
  const [showLimitHint, setShowLimitHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit value when session name changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(session.name);
    }
  }, [session.name, isEditing]);

  // Handle starting edit mode
  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(session.name);
    setShowLimitHint(false);
  };

  // Handle input change with character limit
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_SESSION_NAME_LENGTH) {
      setEditValue(value);
      setShowLimitHint(false);
    } else {
      // Show hint when limit is reached
      setShowLimitHint(true);
      // Still set the truncated value
      setEditValue(value.slice(0, MAX_SESSION_NAME_LENGTH));
    }
  };

  // Handle save
  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.name) {
      onRename(session.id, trimmed);
    }
    setIsEditing(false);
    setShowLimitHint(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setEditValue(session.name);
    setIsEditing(false);
    setShowLimitHint(false);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
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
        onClick={() => !isEditing && setExpanded(!expanded)}
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
            {isEditing ? (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={handleInputChange}
                  onBlur={handleSave}
                  onKeyDown={handleKeyDown}
                  disabled={renaming}
                  maxLength={MAX_SESSION_NAME_LENGTH}
                  className={`w-full text-sm font-medium text-gray-900 bg-white border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                    showLimitHint ? "border-amber-400" : "border-gray-300"
                  }`}
                />
                {showLimitHint && (
                  <div className="absolute -bottom-5 left-0 text-[10px] text-amber-600">
                    Max {MAX_SESSION_NAME_LENGTH} characters
                  </div>
                )}
              </div>
            ) : (
              <div className="group/title flex items-center gap-1">
                <h3
                  className="text-sm font-medium text-gray-900 truncate cursor-text hover:text-primary-600"
                  onClick={handleStartEdit}
                  title="Click to rename"
                >
                  {session.name}
                </h3>
                {/* Edit hint icon */}
                <svg
                  className="w-3 h-3 text-gray-300 opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
            )}
            <p className="text-xs text-gray-500">
              {totalTabs} tab{totalTabs !== 1 ? "s" : ""} · {formatDate(session.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
          {/* Copy Links Button */}
          <button
            onClick={() => onCopyLinks(session)}
            title="Copy all links"
            className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
          </button>

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
