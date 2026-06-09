"use client";

import { useState, useRef, useEffect } from "react";
import { Spinner } from "../../atoms/Spinner/Spinner";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps<T extends ComboboxOption> {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  options: T[];
  isLoading?: boolean;
  placeholder?: string;
  renderOption?: (option: T) => React.ReactNode;
  footerSlot?: React.ReactNode;
  disabled?: boolean;
  id?: string;
}

export function Combobox<T extends ComboboxOption>({
  value,
  onChange,
  onSearch,
  options,
  isLoading = false,
  placeholder = "Buscar...",
  renderOption,
  footerSlot,
  disabled = false,
  id,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onSearch(q);
    setOpen(true);
  }

  function handleSelect(option: T) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  }

  function handleFocus() {
    setOpen(true);
  }

  const displayValue = open ? query : (selectedOption?.label ?? "");

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        id={id}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <Spinner size="sm" />
            </div>
          )}
          {!isLoading && options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
          )}
          {!isLoading && options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(option); }}
            >
              {renderOption ? renderOption(option) : option.label}
            </button>
          ))}
          {footerSlot && (
            <div className="border-t border-gray-200">
              {footerSlot}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
