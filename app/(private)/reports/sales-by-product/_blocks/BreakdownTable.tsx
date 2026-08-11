"use client";

import type { SalesByProductBreakdownRowDto } from "../_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function money(v: string): string {
  return MX.format(Number(v));
}

export function BreakdownTable({ rows, nameLabel }: { rows: SalesByProductBreakdownRowDto[]; nameLabel: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-low">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-medium">{nameLabel}</th>
            <th className="px-4 py-3 text-right font-medium">Tickets</th>
            <th className="px-4 py-3 text-right font-medium">Subtotal</th>
            <th className="px-4 py-3 text-right font-medium">Impuestos</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-center text-on-surface-variant">Sin datos</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.key} className="border-b border-outline-variant/40">
                <td className="px-4 py-3">{r.label}</td>
                <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">{r.ticketCount}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(r.subtotal)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(r.taxTotal)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{money(r.total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
