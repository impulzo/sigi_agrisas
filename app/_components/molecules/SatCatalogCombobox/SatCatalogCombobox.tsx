"use client";

import { useState, useRef, useEffect } from "react";
import { useSatCatalogSearch, type SatCatalog } from "../../../_hooks/useSatCatalogSearch";

interface SatCatalogComboboxProps {
  catalog: SatCatalog;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SatCatalogCombobox({
  catalog,
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: SatCatalogComboboxProps) {
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const effectiveQuery = query.trim() || selected;
  const { options, isLoading } = useSatCatalogSearch(catalog, effectiveQuery);

  useEffect(() => {
    setSelected(value);
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuery(selectedRef.current);
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(raw: string) {
    setQuery(raw);
    setIsOpen(true);
    if (raw.trim() === "") {
      setSelected("");
      onChange("");
    }
  }

  function handleSelect(code: string) {
    setSelected(code);
    setQuery(code);
    onChange(code);
    setIsOpen(false);
  }

  const selectedOption = options.find((o) => o.code === selected);
  const showDescription = query.trim() === selected && selected !== "" && selectedOption;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {isOpen && !disabled && (
        <>
          {isLoading && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface-variant shadow-lg">
              Buscando...
            </div>
          )}
          {!isLoading && effectiveQuery.trim().length >= 2 && options.length === 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface-variant shadow-lg">
              Sin resultados
            </div>
          )}
          {!isLoading && options.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-outline-variant bg-surface shadow-lg">
              {options.map((opt) => (
                <li key={opt.code}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt.code);
                    }}
                    className="w-full text-left px-3 py-2 text-body-sm hover:bg-surface-container-low transition-colors"
                  >
                    <span className="font-mono">{opt.code}</span> — {opt.description}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {showDescription && selectedOption && (
        <p className="text-label-sm text-on-surface-variant mt-1">{selectedOption.description}</p>
      )}
    </div>
  );
}
