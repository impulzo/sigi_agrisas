"use client";

import type { PurchasesReportRowDto } from "../_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function money(v: string): string {
  return MX.format(Number(v));
}
function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { timeZone: "UTC" });
}

const th = "px-3 py-3 text-left font-medium whitespace-nowrap";
const thRight = "px-3 py-3 text-right font-medium whitespace-nowrap";
const td = "px-3 py-3 whitespace-nowrap";
const tdRight = "px-3 py-3 text-right tabular-nums whitespace-nowrap";

export function PurchasesTable({ rows }: { rows: PurchasesReportRowDto[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-low">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
            <th className={th}>Folio</th>
            <th className={th}>Proveedor</th>
            <th className={th}>Sucursal</th>
            <th className={thRight}>Subtotal</th>
            <th className={thRight}>Impuestos</th>
            <th className={thRight}>Total</th>
            <th className={thRight}>Pagado</th>
            <th className={th}>Estado pago</th>
            <th className={th}>Estado</th>
            <th className={th}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-4 text-center text-on-surface-variant">Sin compras</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-outline-variant/40">
                <td className={td}>{r.folioCode}</td>
                <td className={td}>{r.providerName ?? "—"}</td>
                <td className={td}>{r.branchName ?? "—"}</td>
                <td className={tdRight}>{money(r.subtotal)}</td>
                <td className={tdRight}>{money(r.taxTotal)}</td>
                <td className={tdRight}>{money(r.total)}</td>
                <td className={tdRight}>{money(r.paidAmount)}</td>
                <td className={td}>{r.paymentStatus}</td>
                <td className={td}>{r.status}</td>
                <td className={td}>{dateOnly(r.purchasedAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
