/**
 * TabFlow – Toggle Switch Component
 *
 * Wrapper around shadcn Switch for backwards compatibility.
 * Maintains the same API while using the polished shadcn component.
 */

import React from "react";
import { Switch } from "@shared/components/ui";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, disabled = false, label }) => {
  return (
    <Switch checked={enabled} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
  );
};

export default Toggle;
