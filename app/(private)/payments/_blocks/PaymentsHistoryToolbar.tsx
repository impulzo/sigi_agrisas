"use client";

import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import type { PaymentStatus } from "../_logic/types/domain";

interface PaymentsHistoryToolbarProps {
  userId: string;
  onUserIdChange: (v: string) => void;
  customerId: string;
  onCustomerIdChange: (v: string) => void;
  productId: string;
  onProductIdChange: (v: string) => void;
  paymentMethodId: string;
  onPaymentMethodIdChange: (v: string) => void;
  status: PaymentStatus | "";
  onStatusChange: (v: PaymentStatus | "") => void;
  from: string;
  onFromChange: (v: string) => void;
  to: string;
  onToChange: (v: string) => void;
  branchId: string;
  onBranchIdChange: (v: string) => void;
  branches: { id: string; name: string }[];
  isExporting: boolean;
  onExportPdf: () => void;
  onReset: () => void;
}

export function PaymentsHistoryToolbar({
  userId,
  onUserIdChange,
  customerId,
  onCustomerIdChange,
  productId,
  onProductIdChange,
  paymentMethodId,
  onPaymentMethodIdChange,
  status,
  onStatusChange,
  from,
  onFromChange,
  to,
  onToChange,
  branchId,
  onBranchIdChange,
  branches,
  isExporting,
  onExportPdf,
  onReset,
}: PaymentsHistoryToolbarProps) {
  const { can } = useCurrentUser();
  const isBypass = can("branches:access_all");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-label-sm text-on-surface-variant">Cobrador (ID)</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => onUserIdChange(e.target.value)}
          className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary w-44"
          placeholder="UUID cobrador..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-label-sm text-on-surface-variant">Cliente (ID)</label>
        <input
          type="text"
          value={customerId}
          onChange={(e) => onCustomerIdChange(e.target.value)}
          className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary w-44"
          placeholder="UUID cliente..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-label-sm text-on-surface-variant">Producto (ID)</label>
        <input
          type="text"
          value={productId}
          onChange={(e) => onProductIdChange(e.target.value)}
          className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary w-44"
          placeholder="UUID producto..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-label-sm text-on-surface-variant">Método pago (ID)</label>
        <input
          type="text"
          value={paymentMethodId}
          onChange={(e) => onPaymentMethodIdChange(e.target.value)}
          className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary w-44"
          placeholder="UUID método..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-label-sm text-on-surface-variant">Estado</label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as PaymentStatus | "")}
          className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="">Todos</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-label-sm text-on-surface-variant">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
        <span className="text-on-surface-variant text-body-sm mb-2">—</span>
        <div className="flex flex-col gap-1">
          <label className="text-label-sm text-on-surface-variant">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {(isBypass === true) && (
        <div className="flex flex-col gap-1">
          <label className="text-label-sm text-on-surface-variant">Sucursal</label>
          <select
            value={branchId}
            onChange={(e) => onBranchIdChange(e.target.value)}
            className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="">Todas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-outline px-4 py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={isExporting}
          className="rounded-xl bg-secondary text-on-secondary px-4 py-2 text-body-sm font-medium hover:bg-secondary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {isExporting && <Spinner size="sm" />}
          Exportar PDF
        </button>
      </div>
    </div>
  );
}
