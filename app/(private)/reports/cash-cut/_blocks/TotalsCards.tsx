"use client";

import type { CashCutReportDto } from "../_logic/types/api";

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

export function TotalsCards({ report }: { report: CashCutReportDto }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Card label="Total cobrado" value={money(report.totals.totalCollected)} sub={`${report.rows.length} abonos`} />
      <Card label="Total IVA" value={money(report.totals.totalIva)} />
    </div>
  );
}
