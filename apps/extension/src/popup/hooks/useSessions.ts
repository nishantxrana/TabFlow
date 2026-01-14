/**
 * TabFlow – Sessions Hook
 *
 * Fetches and manages sessions state for the popup.
 */

import { useState, useEffect, useCallback } from "react";
import type { Session } from "@shared/types";
import { MessageAction } from "@shared/messages";
import { sendMessage } from "./useMessage";

interface UseSessionsResult {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage sessions.
 * Fetches sessions on mount and provides refetch capability.
 *
 * @example
 * const { sessions, loading, error, refetch } = useSessions();
 */
export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await sendMessage(MessageAction.GET_SESSIONS);
      setSessions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch sessions";
      setError(message);
      console.error("[TabFlow] Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
  };
}
