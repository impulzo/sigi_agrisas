"use client";

import type { SaleItem } from "../../../../_logic/types/domain";

interface ReturnLineRowProps {
  item: SaleItem;
  returnedQty: number;
  value: number;
  error?: string;
  onChange: (qty: number) => void;
}

export function ReturnLineRow({ item, returnedQty, value, error, onChange }: ReturnLineRowProps) {
  const remaining = Math.max(0, item.quantity - returnedQty);

  return (
    <div className="flex flex-col gap-0.5">
      <input
        type="number"
        min={0}
        max={remaining}
        step="0.0001"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        disabled={remaining === 0}
        className="w-24 rounded-md border border-outline px-2 py-1 text-body-sm text-right tabular-nums bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Cantidad a devolver de ${item.productNameSnapshot}`}
      />
      <p className="text-label-sm text-on-surface-variant text-right">
        Disponible: {remaining}
      </p>
      {error && (
        <p className="text-label-sm text-error text-right">{error}</p>
      )}
    </div>
  );
}
