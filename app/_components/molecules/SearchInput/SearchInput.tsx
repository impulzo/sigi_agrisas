"use client";

import { ChangeEvent } from "react";
import { cn } from "../../../_lib/cn";
import { Icon } from "../../atoms/Icon/Icon";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SearchInput({
  placeholder = "Search...",
  value,
  onChange,
  className,
}: SearchInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div
      className={cn(
        "flex items-center bg-surface-container-high px-4 py-2 rounded-full gap-2",
        className,
      )}
    >
      <Icon name="search" className="text-on-surface-variant" />
      <input
        type="search"
        value={value ?? ""}
        onChange={handleChange}
        placeholder={placeholder}
        className="bg-transparent border-none focus:outline-none focus:ring-0 text-body-md placeholder:text-on-surface-variant w-64"
      />
    </div>
  );
}
