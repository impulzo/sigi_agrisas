"use client";

import { SearchInput } from "../../../_components/molecules/SearchInput/SearchInput";

interface SalesToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  branchId: string;
  onBranchChange: (v: string) => void;
  branches: { id: string; name: string }[];
  showBranchFilter: boolean;
  statusFilter: string[];
  onStatusChange: (v: string[]) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "edited", label: "Editada" },
  { value: "returned_total", label: "Devuelto total" },
];

export function SalesToolbar({
  search,
  onSearchChange,
  branchId,
  onBranchChange,
  branches,
  showBranchFilter,
  statusFilter,
  onStatusChange,
  from,
  to,
  onFromChange,
  onToChange,
  onReset,
}: SalesToolbarProps) {
  function toggleStatus(val: string) {
    onStatusChange(
      statusFilter.includes(val)
        ? statusFilter.filter((s) => s !== val)
        : [...statusFilter, val]
    );
  }

  const hasFilters = !!search || !!branchId || statusFilter.length > 0 || !!from || !!to;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por folio, cliente o RFC..."
        />
      </div>

      {showBranchFilter && (
        <select
          value={branchId}
          onChange={(e) => onBranchChange(e.target.value)}
          className="rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          aria-label="Filtrar por sucursal"
        >
          <option value="">Todas las sucursales</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}

      <div className="flex gap-1">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => toggleStatus(s.value)}
            className={`rounded-full px-3 py-1 text-label-sm font-medium transition-colors ${
              statusFilter.includes(s.value)
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        aria-label="Desde"
      />
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        aria-label="Hasta"
      />

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
