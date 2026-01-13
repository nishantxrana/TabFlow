/**
 * TabFlow – Search Bar Component
 *
 * Secondary utility for filtering sessions/tabs.
 * Design: Quiet, supportive - does not compete with primary action.
 */

import React, { useState, useEffect } from "react";
import { SEARCH_DEBOUNCE_MS } from "@shared/constants";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Find a session…",
}) => {
  const [value, setValue] = useState("");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, onSearch]);

  const handleClear = () => {
    setValue("");
    onSearch("");
  };

  return (
    <div className="relative">
      {/* Search Icon */}
      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
        <svg
          className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Input - Soft background, reduced border contrast */}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-7 py-1.5 text-sm bg-gray-50 dark:bg-surface-800 border-0 rounded-md placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-700 dark:text-gray-200 focus:bg-white dark:focus:bg-surface-700 focus:ring-1 focus:ring-primary-200 dark:focus:ring-primary-800 focus:outline-none transition-colors"
      />

      {/* Clear Button */}
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Clear search"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
