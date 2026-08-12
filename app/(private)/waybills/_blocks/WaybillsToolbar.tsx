"use client";

import type { WaybillStatus, WaybillType } from "../_logic/types/api";

interface WaybillsToolbarProps {
  branchId: string;
  onBranchChange: (v: string) => void;
  branches: { id: string; name: string }[];
  showBranchFilter: boolean;
  statusFilter: WaybillStatus[];
  onStatusChange: (v: WaybillStatus[]) => void;
  typeFilter: WaybillType[];
  onTypeChange: (v: WaybillType[]) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: { value: WaybillStatus; label: string }[] = [
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

const TYPE_OPTIONS: { value: WaybillType; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "carta_porte", label: "Carta Porte" },
];

export function WaybillsToolbar({
  branchId,
  onBranchChange,
  branches,
  showBranchFilter,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  from,
  to,
  onFromChange,
  onToChange,
  onReset,
}: WaybillsToolbarProps) {
  function toggleStatus(val: WaybillStatus) {
    onStatusChange(
      statusFilter.includes(val) ? statusFilter.filter((s) => s !== val) : [...statusFilter, val]
    );
  }

  function toggleType(val: WaybillType) {
    onTypeChange(typeFilter.includes(val) ? typeFilter.filter((t) => t !== val) : [...typeFilter, val]);
  }

  const hasFilters = !!branchId || statusFilter.length > 0 || typeFilter.length > 0 || !!from || !!to;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {showBranchFilter && (
        <select
          value={branchId}
          onChange={(e) => onBranchChange(e.target.value)}
          className="rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          aria-label="Filtrar por sucursal"
        >
          <option value="">Todas las sucursales</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-1">
        {TYPE_OPTIONS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => toggleType(t.value)}
            className={`rounded-full px-3 py-1 text-label-sm font-medium transition-colors ${
              typeFilter.includes(t.value)
                ? "bg-secondary text-on-secondary"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          aria-label="Desde"
        />
        <span className="text-on-surface-variant text-body-sm">—</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          aria-label="Hasta"
        />
      </div>

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
