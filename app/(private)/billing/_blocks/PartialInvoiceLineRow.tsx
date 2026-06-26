"use client";

import type { PartialLine } from "../_logic/types/domain";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

interface PartialInvoiceLineRowProps {
  line: PartialLine;
  lineTotal: number;
  onUpdate: (patch: Partial<PartialLine>) => void;
  onRemove: () => void;
}

function NumField({ value, onChange, min = 0, step = "any", placeholder = "" }: { value: number; onChange: (v: number) => void; min?: number; step?: string; placeholder?: string }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      placeholder={placeholder}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded border border-outline px-2 py-1 text-body-sm bg-surface focus:outline-none focus:border-primary tabular-nums"
    />
  );
}

export function PartialInvoiceLineRow({ line, lineTotal, onUpdate, onRemove }: PartialInvoiceLineRowProps) {
  return (
    <tr className="border-b border-outline-variant/40 align-top">
      <td className="px-2 py-2">
        <div className="space-y-1">
          <input
            type="text"
            value={line.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Descripción *"
            className="w-full rounded border border-outline px-2 py-1 text-body-sm bg-surface focus:outline-none focus:border-primary"
          />
          {!line.productId && (
            <input
              type="text"
              value={line.satProductCode}
              onChange={(e) => onUpdate({ satProductCode: e.target.value })}
              placeholder="Clave SAT (8 dígitos)"
              maxLength={8}
              className="w-full rounded border border-outline px-2 py-1 text-body-sm bg-surface focus:outline-none focus:border-primary font-mono"
            />
          )}
          <p className="text-label-sm text-on-surface-variant font-mono">{line.productCode}</p>
        </div>
      </td>
      <td className="px-2 py-2 w-20">
        <NumField value={line.quantity} onChange={(v) => onUpdate({ quantity: v })} min={0.001} step="0.001" placeholder="1" />
      </td>
      <td className="px-2 py-2 w-28">
        <NumField value={line.unitPrice} onChange={(v) => onUpdate({ unitPrice: v })} step="0.01" placeholder="0.00" />
      </td>
      <td className="px-2 py-2 w-20">
        <NumField value={line.discountPct} onChange={(v) => onUpdate({ discountPct: Math.min(100, Math.max(0, v)) })} min={0} step="0.01" placeholder="0" />
      </td>
      <td className="px-2 py-2 w-20">
        <NumField value={line.ivaRate * 100} onChange={(v) => onUpdate({ ivaRate: Math.min(1, v / 100) })} min={0} step="1" placeholder="16" />
      </td>
      <td className="px-2 py-2 w-20">
        <NumField value={line.iepsRate * 100} onChange={(v) => onUpdate({ iepsRate: Math.min(1, v / 100) })} min={0} step="1" placeholder="0" />
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-body-sm font-medium">
        {MX.format(lineTotal)}
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={onRemove}
          title="Quitar línea"
          className="text-error hover:text-error/70 text-label-sm transition-colors"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
