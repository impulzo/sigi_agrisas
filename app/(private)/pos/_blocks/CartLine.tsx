"use client";

import { Icon } from "../../../_components/atoms/Icon/Icon";
import { formatMxCurrency } from "../_logic/lib/formatMxCurrency";
import type { CartLine as CartLineType } from "../_logic/types/domain";

interface CartLineProps {
  line: CartLineType;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateDiscount: (id: string, pct: number) => void;
  onChangeTier: (id: string) => void;
  onRemove: (id: string) => void;
}

export function CartLine({
  line,
  onUpdateQuantity,
  onUpdateDiscount,
  onChangeTier,
  onRemove,
}: CartLineProps) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-outline-variant last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-medium text-on-surface truncate">{line.productName}</p>
          <p className="text-label-sm text-on-surface-variant font-mono">{line.productCode}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(line.id)}
          className="shrink-0 text-error hover:text-error/80 transition-colors"
          aria-label="Quitar del carrito"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeTier(line.id)}
          className="text-label-sm text-primary hover:text-primary/80 underline"
        >
          {line.priceName}
        </button>
        <span className="text-label-sm text-on-surface-variant">
          {formatMxCurrency(line.unitPrice)} c/u
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <label className="text-label-sm text-on-surface-variant">Cant.</label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={line.quantity}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v > 0) onUpdateQuantity(line.id, v);
            }}
            className="w-20 rounded border border-outline px-2 py-1 text-body-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-label-sm text-on-surface-variant">Desc. %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={line.discountPct}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onUpdateDiscount(line.id, v);
            }}
            className="w-16 rounded border border-outline px-2 py-1 text-body-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="ml-auto text-body-sm font-medium tabular-nums text-on-surface">
          {formatMxCurrency(line.lineTotal)}
        </span>
      </div>
    </div>
  );
}
