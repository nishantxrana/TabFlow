/**
 * TabFlow – Session Card Component
 *
 * Sessions represent something valuable the user saved.
 * They should feel like treasured objects, safe and accessible.
 *
 * Design philosophy:
 * - Cards should feel stable and grounded
 * - Actions should be available but not demanding
 * - Hover states should be gentle, not harsh
 * - The overall feeling: "Your tabs are safe here"
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

  const totalTabs = session.groups.reduce((sum, g) => sum + g.tabs.length, 0);

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

    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) setEditValue(session.name);
  }, [session.name, isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(session.name);
    setShowLimitHint(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_SESSION_NAME_LENGTH) {
      setEditValue(value);
      setShowLimitHint(false);
    } else {
      setShowLimitHint(true);
      setEditValue(value.slice(0, MAX_SESSION_NAME_LENGTH));
    }
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.name) {
      onRename(session.id, trimmed);
    }
    setIsEditing(false);
    setShowLimitHint(false);
  };

  const handleCancel = () => {
    setEditValue(session.name);
    setIsEditing(false);
    setShowLimitHint(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const hasMatchingTabs = searchQuery
    ? session.groups.some((group) =>
        group.tabs.some(
          (tab) =>
            tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tab.domain.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : true;

  const isExpanded = expanded || (searchQuery && hasMatchingTabs);
  if (searchQuery && !hasMatchingTabs) return null;

  const isLoading = restoring || deleting || renaming;

  return (
    <div
      className={`group rounded-xl border bg-white transition-all duration-200 dark:bg-surface-850 ${
        isExpanded
          ? "border-stone-200 shadow-sm dark:border-surface-700"
          : "border-stone-100 hover:border-stone-200 hover:shadow-sm dark:border-surface-800 dark:hover:border-surface-700"
      } ${isLoading ? "opacity-60" : ""}`}
    >
      {/* Card Header */}
      <div
        className="flex cursor-pointer select-none items-start gap-3 px-4 py-3"
        onClick={() => !isEditing && setExpanded(!expanded)}
      >
        {/* Expand Chevron - gentle */}
        <button
          className="-ml-1 mt-0.5 rounded-lg p-1 text-stone-300 transition-all duration-200 hover:bg-stone-50 hover:text-stone-500 dark:text-stone-600 dark:hover:bg-surface-800 dark:hover:text-stone-400"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Session Content */}
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
                className={`w-full rounded-lg border bg-white px-2.5 py-1 text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:bg-surface-800 dark:text-stone-100 dark:focus:ring-primary-400/30 ${
                  showLimitHint ? "border-amber-400" : "dark:border-surface-600 border-stone-200"
                }`}
              />
              {showLimitHint && (
                <span className="absolute -bottom-5 left-0 text-[10px] text-amber-600 dark:text-amber-500">
                  Max {MAX_SESSION_NAME_LENGTH} characters
                </span>
              )}
            </div>
          ) : (
            <>
              {/* Title - warm, inviting */}
              <h3
                className="cursor-text truncate text-sm font-medium leading-snug text-stone-700 hover:text-stone-900 dark:text-stone-100 dark:hover:text-white"
                onClick={handleStartEdit}
                title={`${session.name} – click to rename`}
              >
                {session.name}
              </h3>
              {/* Metadata - reassuring context */}
              <p className="mt-0.5 text-xs leading-snug text-stone-400 dark:text-stone-500">
                {totalTabs} {totalTabs === 1 ? "tab" : "tabs"} · {formatDate(session.createdAt)}
              </p>
            </>
          )}
        </div>

        {/* Action Icons - gentle, supportive */}
        <div
          className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Copy Links */}
          <button
            onClick={() => onCopyLinks(session)}
            disabled={isLoading}
            title="Copy all links"
            className="rounded-lg p-2 text-stone-300 transition-all duration-200 hover:bg-stone-50 hover:text-stone-500 disabled:opacity-40 dark:text-stone-600 dark:hover:bg-surface-700 dark:hover:text-stone-400"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
          </button>

          {/* Restore - warm accent color */}
          <button
            onClick={() => onRestore(session.id)}
            disabled={isLoading}
            title="Open all tabs"
            className="rounded-lg p-2 text-primary-500 transition-all duration-200 hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40 dark:text-primary-400 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
          >
            {restoring ? (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            )}
          </button>

          {/* Delete - gentle, not aggressive */}
          <button
            onClick={() => onDelete(session.id)}
            disabled={isLoading}
            title="Remove session"
            className="rounded-lg p-2 text-stone-300 transition-all duration-200 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40 dark:text-stone-600 dark:hover:bg-rose-900/15 dark:hover:text-rose-400"
          >
            {deleting ? (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content - Tabs List */}
      {isExpanded && (
        <div className="border-t border-stone-50 px-4 pb-3 pt-0 dark:border-surface-800">
          {session.groups.map((group) => (
            <GroupView key={group.id} group={group} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionCard;
