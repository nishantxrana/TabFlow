/**
 * TabFlow – Tab Capture Module
 *
 * Handles capturing tab metadata from Chrome.
 * This module is the ONLY place that interacts with chrome.tabs API.
 *
 * Privacy:
 * - Only captures: title, URL, domain, favicon
 * - Does NOT read page content
 * - Does NOT track browsing history
 */

import type { TabSnapshot } from "@shared/types";

// =============================================================================
// Domain Extraction
// =============================================================================

/**
 * Extract domain from a URL.
 * Returns empty string for invalid URLs or special pages.
 */
export function extractDomain(url: string): string {
  try {
    // Handle special Chrome URLs
    if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
      return url.split("/")[2] || "";
    }

    // Handle about: pages
    if (url.startsWith("about:")) {
      return "about";
    }

    // Handle file:// URLs
    if (url.startsWith("file://")) {
      return "local-file";
    }

    // Standard URL parsing
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "";
  }
}

// =============================================================================
// Tab Snapshot Creation
// =============================================================================

/**
 * Convert a Chrome tab to a TabSnapshot.
 * Extracts only the metadata we need.
 */
export function createTabSnapshot(tab: chrome.tabs.Tab): TabSnapshot {
  return {
    title: tab.title || "Untitled",
    url: tab.url || "",
    domain: extractDomain(tab.url || ""),
    favicon: tab.favIconUrl || "",
    // lastAccessed is not always available, use current time as fallback
    lastAccessed: Date.now(),
  };
}

// =============================================================================
// Tab Capture Functions
// =============================================================================

/**
 * Get all tabs in the current window.
 *
 * @returns Promise resolving to array of TabSnapshots
 */
export async function getCurrentWindowTabs(): Promise<TabSnapshot[]> {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  return tabs
    .filter((tab) => {
      // Filter out extension pages and invalid tabs
      if (!tab.url) return false;
      if (tab.url.startsWith("chrome-extension://")) return false;
      return true;
    })
    .map(createTabSnapshot);
}

/**
 * Get all tabs across all windows.
 *
 * @returns Promise resolving to array of TabSnapshots
 */
export async function getAllTabs(): Promise<TabSnapshot[]> {
  const tabs = await chrome.tabs.query({});

  return tabs
    .filter((tab) => {
      if (!tab.url) return false;
      if (tab.url.startsWith("chrome-extension://")) return false;
      return true;
    })
    .map(createTabSnapshot);
}

/**
 * Get a single tab by ID.
 *
 * @param tabId - Chrome tab ID
 * @returns Promise resolving to TabSnapshot or undefined
 */
export async function getTabById(
  tabId: number
): Promise<TabSnapshot | undefined> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return createTabSnapshot(tab);
  } catch {
    // Tab doesn't exist
    return undefined;
  }
}

// =============================================================================
// Tab Restoration
// =============================================================================

/**
 * Open tabs from an array of TabSnapshots.
 * Opens tabs in the current window.
 *
 * @param tabs - Array of TabSnapshots to restore
 * @returns Promise resolving to number of tabs opened
 */
export async function restoreTabs(tabs: TabSnapshot[]): Promise<number> {
  let opened = 0;

  for (const tab of tabs) {
    // Skip invalid URLs
    if (!tab.url || tab.url === "") continue;

    // Skip chrome:// and extension URLs (can't open them)
    if (tab.url.startsWith("chrome://")) continue;
    if (tab.url.startsWith("chrome-extension://")) continue;

    try {
      await chrome.tabs.create({
        url: tab.url,
        active: false, // Don't switch to each tab
      });
      opened++;
    } catch (error) {
      console.warn("[TabFlow] Failed to restore tab:", tab.url, error);
    }
  }

  return opened;
}

/**
 * Open all tabs from a session's groups.
 *
 * @param groups - Array of groups containing tabs
 * @returns Promise resolving to number of tabs opened
 */
export async function restoreSessionTabs(
  groups: { tabs: TabSnapshot[] }[]
): Promise<number> {
  let totalOpened = 0;

  for (const group of groups) {
    const opened = await restoreTabs(group.tabs);
    totalOpened += opened;
  }

  return totalOpened;
}

