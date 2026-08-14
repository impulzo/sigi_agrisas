"use client";

import { CustomerFilterCombobox } from "../../../_blocks/CustomerFilterCombobox";

interface Option {
  id: string;
  name: string;
}

interface Props {
  branchId: string;
  onBranchIdChange: (v: string) => void;
  branches: Option[];
  showBranchFilter: boolean;
  customerId: string;
  onCustomerIdChange: (v: string) => void;
  from: string;
  onFromChange: (v: string) => void;
  to: string;
  onToChange: (v: string) => void;
}

const inputCls =
  "rounded-md border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40";

export function CollectionsFilters({
  branchId, onBranchIdChange, branches, showBranchFilter,
  customerId, onCustomerIdChange,
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
        <CustomerFilterCombobox value={customerId} onChange={onCustomerIdChange} />
      </div>

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
