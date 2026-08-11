"use client";

import type { ProviderPaymentsReportRowDto } from "../_logic/types/api";

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

export function ProviderPaymentsTable({ rows }: { rows: ProviderPaymentsReportRowDto[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-low">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
            <th className={th}>Folio pago</th>
            <th className={th}>Folio compra</th>
            <th className={th}>Proveedor</th>
            <th className={th}>Sucursal</th>
            <th className={thRight}>Monto</th>
            <th className={th}>Estado</th>
            <th className={th}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-4 text-center text-on-surface-variant">Sin pagos a proveedores</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-outline-variant/40">
                <td className={td}>{r.folioCode}</td>
                <td className={td}>{r.purchaseFolioCode}</td>
                <td className={td}>{r.providerName ?? "—"}</td>
                <td className={td}>{r.branchName ?? "—"}</td>
                <td className={tdRight}>{money(r.amount)}</td>
                <td className={td}>{r.status}</td>
                <td className={td}>{dateOnly(r.paidAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
