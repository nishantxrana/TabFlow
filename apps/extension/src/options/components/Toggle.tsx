/**
 * TabFlow – Toggle Switch Component
 *
 * Design philosophy:
 * - Toggles should feel satisfying and responsive
 * - Warm accent color for active state
 * - Gentle transitions
 */

import React from "react";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  enabled,
  onChange,
  disabled = false,
  label,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:focus:ring-primary-400/40 focus:ring-offset-2 dark:focus:ring-offset-surface-850
        ${enabled ? "bg-primary-500 dark:bg-primary-500" : "bg-stone-200 dark:bg-surface-600"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0
          transition-transform duration-200 ease-out
          ${enabled ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
};

export default Toggle;
