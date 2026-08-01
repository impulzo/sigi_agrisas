"use client";

import type { CashCutRowDto } from "../_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});
function money(v: string): string {
  return MX.format(Number(v));
}
function pct(v: string): string {
  return `${(Number(v) * 100).toFixed(0)}%`;
}
function dateOnly(iso: string): string {
  return iso;
}
function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { timeZone: "UTC" });
}

const th = "px-3 py-3 text-left font-medium whitespace-nowrap";
const thRight = "px-3 py-3 text-right font-medium whitespace-nowrap";
const td = "px-3 py-3 whitespace-nowrap";
const tdRight = "px-3 py-3 text-right tabular-nums whitespace-nowrap";

export function CollectionsRowsTable({ rows }: { rows: CashCutRowDto[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-title-sm font-medium text-on-surface">Cobranza del periodo</h3>
      <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-low">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
              <th className={th}>Cte</th>
              <th className={th}>Docto</th>
              <th className={th}>Factura</th>
              <th className={th}>Nombre del cliente</th>
              <th className={th}>Fec-Fact</th>
              <th className={thRight}>Días</th>
              <th className={thRight}>Importe</th>
              <th className={th}>Fp</th>
              <th className={th}>Referencia</th>
              <th className={th}>F. Cobro</th>
              <th className={thRight}>I.V.A.</th>
              <th className={thRight}>Tasa%</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-4 text-center text-on-surface-variant">
                  Sin cobranza en el periodo
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.paymentId} className="border-b border-outline-variant/40">
                  <td className={td}>{r.customerCode}</td>
                  <td className={td}>{r.docto}</td>
                  <td className={td}>{r.factura}</td>
                  <td className={td}>{r.customerName}</td>
                  <td className={td}>{dateOnly(r.facturaDate)}</td>
                  <td className={tdRight}>{r.days}</td>
                  <td className={tdRight}>{money(r.amount)}</td>
                  <td className={td}>{r.paymentMethodName}</td>
                  <td className={td}>{r.reference ?? ""}</td>
                  <td className={td}>{dateTime(r.collectedAt)}</td>
                  <td className={tdRight}>{money(r.ivaAmount)}</td>
                  <td className={tdRight}>{pct(r.taxRatePct)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
