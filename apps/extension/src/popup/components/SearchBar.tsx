/**
 * TabFlow – Search Bar Component
 *
 * Design philosophy:
 * - Search should feel like a helpful utility, not a demand
 * - Gentle placeholder text that guides without pressure
 * - Soft focus states that feel welcoming
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
      {/* Search Icon - gentle gray */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
        <svg
          className="h-4 w-4 text-stone-300 dark:text-stone-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Input - soft, welcoming */}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-0 bg-stone-50 py-2.5 pl-10 pr-9 text-sm text-stone-700 transition-all duration-200 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:bg-surface-800 dark:text-stone-200 dark:placeholder:text-stone-500 dark:focus:bg-surface-700 dark:focus:ring-primary-400/20"
      />

      {/* Clear Button - gentle hover */}
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 transition-colors duration-200 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
          aria-label="Clear search"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
