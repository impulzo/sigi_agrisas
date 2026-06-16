"use client";

import { Icon } from "../../../_components/atoms/Icon/Icon";
import { formatMxCurrency } from "../_logic/lib/formatMxCurrency";
import type { CartLine as CartLineType } from "../_logic/types/domain";

interface ListItemProps {
  tabIndex: number;
  ref: (el: HTMLElement | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  "aria-selected": boolean;
}

interface CartLineProps {
  line: CartLineType;
  itemProps?: ListItemProps;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateDiscount: (id: string, pct: number) => void;
  onChangeTier: (id: string) => void;
  onRemove: (id: string) => void;
}

function stopShortcutKeys(e: React.KeyboardEvent) {
  if (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "Delete" || e.key === "Backspace") {
    e.stopPropagation();
  }
}

export function CartLine({
  line,
  itemProps,
  onUpdateQuantity,
  onUpdateDiscount,
  onChangeTier,
  onRemove,
}: CartLineProps) {
  return (
    <div
      {...itemProps}
      aria-keyshortcuts="+ - Delete Enter"
      className="flex flex-col gap-2 py-3 border-b border-outline-variant last:border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary rounded"
    >
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
            onKeyDown={stopShortcutKeys}
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
            onKeyDown={stopShortcutKeys}
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
