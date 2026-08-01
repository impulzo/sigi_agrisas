"use client";

import type { SalesCutReportDto } from "../_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});
function money(v: string): string {
  return MX.format(Number(v));
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3">
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <span className="text-title-md font-semibold text-on-surface tabular-nums">{value}</span>
      {sub && <span className="text-label-sm text-on-surface-variant">{sub}</span>}
    </div>
  );
}

export function TotalsCards({ report }: { report: SalesCutReportDto }) {
  const t = report.totals;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Card label="Ventas" value={money(t.grossSales)} sub={`${t.ticketCount} tickets`} />
      <Card label="Subtotal" value={money(t.subtotal)} />
      <Card label="IVA" value={money(t.ivaTotal)} />
      <Card label="IEPS" value={money(t.iepsTotal)} />
      <Card label="Impuestos" value={money(t.taxTotal)} />
      <Card
        label="Canceladas"
        value={money(report.cancelled.total)}
        sub={`${report.cancelled.count} tickets`}
      />
    </div>
  );
}
