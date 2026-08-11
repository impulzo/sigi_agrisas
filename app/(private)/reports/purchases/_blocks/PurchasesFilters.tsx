"use client";

import { ProviderFilterCombobox } from "./ProviderFilterCombobox";

interface Option {
  id: string;
  name: string;
}

interface Props {
  branchId: string;
  onBranchIdChange: (v: string) => void;
  branches: Option[];
  showBranchFilter: boolean;
  providerId: string;
  onProviderIdChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  from: string;
  onFromChange: (v: string) => void;
  to: string;
  onToChange: (v: string) => void;
}

const inputCls =
  "rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40";

export function PurchasesFilters({
  branchId, onBranchIdChange, branches, showBranchFilter,
  providerId, onProviderIdChange,
  status, onStatusChange,
  from, onFromChange, to, onToChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {showBranchFilter && (
        <label className="flex flex-col gap-1">
          <span className="text-label-sm text-on-surface-variant">Sucursal</span>
          <select value={branchId} onChange={(e) => onBranchIdChange(e.target.value)} className={inputCls}>
            <option value="">Todas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
      )}

      <div className="w-56">
        <ProviderFilterCombobox value={providerId} onChange={onProviderIdChange} />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-on-surface-variant">Estado</span>
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} className={inputCls}>
          <option value="">Todos</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-on-surface-variant">Desde</span>
        <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className={inputCls} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-on-surface-variant">Hasta</span>
        <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className={inputCls} />
      </label>
    </div>
  );
}
