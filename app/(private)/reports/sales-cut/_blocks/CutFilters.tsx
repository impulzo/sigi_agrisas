"use client";

interface Option {
  id: string;
  name: string;
}

interface Props {
  branchId: string;
  onBranchIdChange: (v: string) => void;
  branches: Option[];
  showBranchFilter: boolean;
  cashierId: string;
  onCashierIdChange: (v: string) => void;
  cashiers: Option[];
  paymentMethodId: string;
  onPaymentMethodIdChange: (v: string) => void;
  paymentMethods: Option[];
}

const inputCls =
  "rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40";

export function CutFilters({
  branchId, onBranchIdChange, branches, showBranchFilter,
  cashierId, onCashierIdChange, cashiers,
  paymentMethodId, onPaymentMethodIdChange, paymentMethods,
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

      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-on-surface-variant">Cajero</span>
        <select value={cashierId} onChange={(e) => onCashierIdChange(e.target.value)} className={inputCls}>
          <option value="">Todos</option>
          {cashiers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-on-surface-variant">Método de pago</span>
        <select value={paymentMethodId} onChange={(e) => onPaymentMethodIdChange(e.target.value)} className={inputCls}>
          <option value="">Todos</option>
          {paymentMethods.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
