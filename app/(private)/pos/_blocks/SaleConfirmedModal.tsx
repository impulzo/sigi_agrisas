"use client";

import { useRouter } from "next/navigation";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { formatMxCurrency } from "../_logic/lib/formatMxCurrency";
import type { SaleDetailDto } from "../_logic/types/api";

interface SaleConfirmedModalProps {
  sale: SaleDetailDto;
  onNewSale: () => void;
}

export function SaleConfirmedModal({ sale, onNewSale }: SaleConfirmedModalProps) {
  const router = useRouter();

  const folioLabel = sale.folioPrefix
    ? `${sale.folioPrefix}-${sale.folioNumber}`
    : String(sale.folioNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl text-center">
        <div className="flex justify-center mb-4">
          <span className="text-5xl text-primary">
            <Icon name="check_circle" size={64} />
          </span>
        </div>

        <h2 className="text-title-md font-semibold text-on-surface mb-1">
          ¡Venta registrada!
        </h2>

        <p className="text-body-sm text-on-surface-variant mb-4">
          Folio <strong className="font-mono">{folioLabel}</strong>
        </p>

        <div className="space-y-2 mb-6 text-left bg-surface-container-low rounded-xl p-4">
          <div className="flex justify-between text-body-sm">
            <span className="text-on-surface-variant">Total</span>
            <span className="font-semibold tabular-nums text-on-surface">
              {formatMxCurrency(sale.total)}
            </span>
          </div>
          {sale.customerName && (
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Cliente</span>
              <span className="text-on-surface">{sale.customerName}</span>
            </div>
          )}
          <div className="flex justify-between text-body-sm">
            <span className="text-on-surface-variant">Artículos</span>
            <span className="text-on-surface">{sale.items.length}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onNewSale}
            className="flex-1 rounded-full border border-outline py-2 text-body-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Nueva venta
          </button>
          <button
            type="button"
            onClick={() => router.push(`/sales/${sale.id}`)}
            className="flex-1 rounded-full bg-primary py-2 text-body-sm font-medium text-on-primary hover:bg-primary/90 transition-colors"
          >
            Ver ticket
          </button>
        </div>
      </div>
    </div>
  );
}
