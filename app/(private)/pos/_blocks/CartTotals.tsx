"use client";

import { formatMxCurrency } from "../_logic/lib/formatMxCurrency";
import type { CartTotals as CartTotalsType } from "../_logic/types/domain";

interface CartTotalsProps {
  totals: CartTotalsType;
}

export function CartTotals({ totals }: CartTotalsProps) {
  return (
    <div className="space-y-1 border-t border-outline-variant pt-3">
      <div className="flex justify-between text-body-sm text-on-surface-variant">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatMxCurrency(totals.subtotal)}</span>
      </div>
      {totals.ivaTotal > 0 && (
        <div className="flex justify-between text-body-sm text-on-surface-variant">
          <span>IVA</span>
          <span className="tabular-nums">{formatMxCurrency(totals.ivaTotal)}</span>
        </div>
      )}
      {totals.iepsTotal > 0 && (
        <div className="flex justify-between text-body-sm text-on-surface-variant">
          <span>IEPS</span>
          <span className="tabular-nums">{formatMxCurrency(totals.iepsTotal)}</span>
        </div>
      )}
      <div className="flex justify-between text-body-md font-semibold text-on-surface border-t border-outline-variant pt-2 mt-2">
        <span>Total</span>
        <span className="tabular-nums">{formatMxCurrency(totals.total)}</span>
      </div>
    </div>
  );
}
