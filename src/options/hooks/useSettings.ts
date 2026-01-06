/**
 * TabFlow – Settings Hook
 *
 * Fetches and manages settings state for the options page.
 */

import { useState, useEffect, useCallback } from "react";
import type { Settings, Tier } from "@shared/types";
import { DEFAULT_SETTINGS } from "@shared/types";
import { MessageAction } from "@shared/messages";
import { sendMessage } from "./useMessage";

interface UseSettingsResult {
  settings: Settings;
  tier: Tier;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage settings.
 * Fetches settings and tier on mount.
 */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tier, setTier] = useState<Tier>("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [settingsData, tierData] = await Promise.all([
        sendMessage(MessageAction.GET_SETTINGS),
        sendMessage(MessageAction.GET_TIER),
      ]);
      setSettings(settingsData);
      setTier(tierData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch settings";
      setError(message);
      console.error("[TabFlow] Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update settings
  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      const newSettings = { ...settings, ...updates };
      
      try {
        await sendMessage(MessageAction.UPDATE_SETTINGS, newSettings);
        setSettings(newSettings);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update settings";
        setError(message);
        throw err;
      }
    },
    [settings]
  );

  return {
    settings,
    tier,
    loading,
    error,
    updateSettings,
    refetch: fetchData,
  };
}

