"use client";

import { Icon } from "../../../_components/atoms/Icon/Icon";
import { Switch } from "../../../_components/atoms/Switch/Switch";

interface CatalogToolbarProps {
  canWrite: boolean;
  onCreate: () => void;
  searchValue: string;
  onSearchChange: (val: string) => void;
  includeInactive: boolean;
  onIncludeInactiveChange: (val: boolean) => void;
  searchPlaceholder?: string;
  searchScope?: "client" | "server";
  searchMinLength?: number;
  createButtonLabel?: string;
}

export function CatalogToolbar({
  canWrite,
  onCreate,
  searchValue,
  onSearchChange,
  includeInactive,
  onIncludeInactiveChange,
  searchPlaceholder = "Buscar...",
  searchScope = "client",
  searchMinLength = 2,
  createButtonLabel = "Nuevo",
}: CatalogToolbarProps) {
  const showMinLengthHint =
    searchScope === "server" && searchValue.length > 0 && searchValue.length < searchMinLength;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <Icon name="search" size={18} />
          </span>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Switch
            checked={includeInactive}
            onChange={onIncludeInactiveChange}
            aria-label="Mostrar inactivos"
          />
          <span className="text-label-lg text-on-surface-variant">Mostrar inactivos</span>
        </label>

        {canWrite && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Icon name="add" size={18} />
            {createButtonLabel}
          </button>
        )}
      </div>

      {searchScope === "server" && !showMinLengthHint && (
        <p className="text-label-sm text-on-surface-variant pl-1">
          Búsqueda en servidor · {searchMinLength}+ caracteres
        </p>
      )}
      {showMinLengthHint && (
        <p className="text-label-sm text-error pl-1">
          Mínimo {searchMinLength} caracteres
        </p>
      )}
    </div>
  );
}
