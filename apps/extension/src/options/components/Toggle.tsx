/**
 * TabFlow – Toggle Switch Component
 *
 * Accessible toggle switch for boolean settings.
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
        relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-surface-850
        ${enabled ? "bg-primary-600 dark:bg-primary-500" : "bg-gray-300 dark:bg-surface-600"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-100 shadow ring-0
          transition duration-200 ease-in-out
          ${enabled ? "translate-x-4" : "translate-x-0"}
        `}
      />
    </button>
  );
};

export default Toggle;
