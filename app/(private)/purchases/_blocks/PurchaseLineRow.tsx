"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import type { PurchaseFormLine } from "../_logic/hooks/useCreatePurchaseForm";

const NUMBER_DRAFT_PATTERN = /^\d*\.?\d{0,4}$/;

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function fmt(n: number) { return MX.format(n); }

interface PurchaseLineRowProps {
  line: PurchaseFormLine;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateUnitCost: (id: string, cost: number) => void;
  onUpdateDiscount: (id: string, pct: number) => void;
  onRemove: (id: string) => void;
}

export function PurchaseLineRow({
  line,
  onUpdateQuantity,
  onUpdateUnitCost,
  onUpdateDiscount,
  onRemove,
}: PurchaseLineRowProps) {
  const [quantityDraft, setQuantityDraft] = useState(String(line.quantity));
  const [unitCostDraft, setUnitCostDraft] = useState(String(line.unitCost));
  const quantityFocusedRef = useRef(false);
  const unitCostFocusedRef = useRef(false);

  useEffect(() => {
    if (!quantityFocusedRef.current) setQuantityDraft(String(line.quantity));
  }, [line.quantity]);

  useEffect(() => {
    if (!unitCostFocusedRef.current) setUnitCostDraft(String(line.unitCost));
  }, [line.unitCost]);

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
          aria-label="Quitar de la compra"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <label className="text-label-sm text-on-surface-variant">Cant.</label>
          <input
            type="text"
            inputMode="decimal"
            value={quantityDraft}
            onFocus={() => { quantityFocusedRef.current = true; }}
            onBlur={() => {
              quantityFocusedRef.current = false;
              const v = parseFloat(quantityDraft);
              setQuantityDraft(isNaN(v) || v <= 0 ? String(line.quantity) : String(v));
            }}
            onChange={(e) => {
              const raw = e.target.value;
              if (!NUMBER_DRAFT_PATTERN.test(raw)) return;
              setQuantityDraft(raw);
              const v = parseFloat(raw);
              if (!isNaN(v) && v > 0) onUpdateQuantity(line.id, v);
            }}
            className="w-20 rounded border border-outline px-2 py-1 text-body-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1">
          <label className="text-label-sm text-on-surface-variant">Costo unit.</label>
          <input
            type="text"
            inputMode="decimal"
            value={unitCostDraft}
            onFocus={() => { unitCostFocusedRef.current = true; }}
            onBlur={() => {
              unitCostFocusedRef.current = false;
              const v = parseFloat(unitCostDraft);
              setUnitCostDraft(isNaN(v) || v < 0 ? String(line.unitCost) : String(v));
            }}
            onChange={(e) => {
              const raw = e.target.value;
              if (!NUMBER_DRAFT_PATTERN.test(raw)) return;
              setUnitCostDraft(raw);
              const v = parseFloat(raw);
              if (!isNaN(v) && v >= 0) onUpdateUnitCost(line.id, v);
            }}
            className="w-24 rounded border border-outline px-2 py-1 text-body-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          {fmt(line.lineTotal)}
        </span>
      </div>
    </div>
  );
}
