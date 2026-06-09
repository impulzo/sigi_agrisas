"use client";

import { Icon } from "../../atoms/Icon/Icon";
import type { IconName } from "../../atoms/Icon/icons";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedButtonProps<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function SegmentedButton<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
}: SegmentedButtonProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex rounded-full border border-outline overflow-hidden"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isSelected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={[
              "flex items-center gap-1 px-4 py-2 text-label-large transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isSelected
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface text-on-surface-variant hover:bg-surface-container-low",
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {opt.icon && (
              <Icon name={opt.icon} className="text-[18px]" />
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
