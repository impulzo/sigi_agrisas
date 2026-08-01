"use client";

import { ExportPdfButton } from "./ExportPdfButton";

interface Branch {
  id: string;
  name: string;
}

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  from: string;
  onFromChange: (v: string) => void;
  to: string;
  onToChange: (v: string) => void;
  onlyWithBalance: boolean;
  onOnlyWithBalanceChange: (v: boolean) => void;
  branchId: string;
  onBranchIdChange: (v: string) => void;
  branches: Branch[];
  showBranchFilter: boolean;
  isExporting: boolean;
  onExportPdf: () => void;
  onReset: () => void;
}

const inputCls =
  "rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40";

export function StatementToolbar({
  search, onSearchChange,
  from, onFromChange,
  to, onToChange,
  onlyWithBalance, onOnlyWithBalanceChange,
  branchId, onBranchIdChange,
  branches, showBranchFilter,
  isExporting, onExportPdf, onReset,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3">
      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-on-surface-variant">Buscar cliente</span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Nombre o código (2+)"
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-on-surface-variant">Desde</span>
        <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className={inputCls} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-on-surface-variant">Hasta</span>
        <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className={inputCls} />
      </label>

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

      <label className="flex items-center gap-2 py-2">
        <input
          type="checkbox"
          checked={onlyWithBalance}
          onChange={(e) => onOnlyWithBalanceChange(e.target.checked)}
          className="h-4 w-4 rounded border-outline-variant"
        />
        <span className="text-body-sm text-on-surface-variant">Solo con saldo</span>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full px-4 py-2 text-body-sm text-on-surface-variant hover:bg-surface-container"
        >
          Limpiar
        </button>
        <ExportPdfButton isExporting={isExporting} onClick={onExportPdf} />
      </div>
    </div>
  );
}
