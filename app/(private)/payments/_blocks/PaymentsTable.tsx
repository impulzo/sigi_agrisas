"use client";

import Link from "next/link";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Skeleton } from "../../../_components/atoms/Skeleton/Skeleton";
import type { Payment } from "../_logic/types/domain";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function fmt(n: number) { return MX.format(n); }
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(d);
}

interface PaymentsTableProps {
  items: Payment[];
  isLoading: boolean;
  showBranch: boolean;
}

export function PaymentsTable({ items, isLoading, showBranch }: PaymentsTableProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={40} width="100%" />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-medium">Folio recibo</th>
            <th className="px-4 py-3 text-left font-medium">Folio venta</th>
            <th className="px-4 py-3 text-left font-medium">Cliente</th>
            <th className="px-4 py-3 text-left font-medium">Cobrador</th>
            <th className="px-4 py-3 text-left font-medium">Método</th>
            {showBranch && <th className="px-4 py-3 text-left font-medium">Sucursal</th>}
            <th className="px-4 py-3 text-right font-medium">Monto</th>
            <th className="px-4 py-3 text-left font-medium">Fecha</th>
            <th className="px-4 py-3 text-left font-medium">Estado</th>
            <th className="px-4 py-3 text-left font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => {
            const folioLabel = p.folioPrefix
              ? `${p.folioPrefix}${p.folioNumber}`
              : String(p.folioNumber);
            return (
              <tr key={p.id} className="border-b border-outline-variant/40 hover:bg-surface-container-low transition-colors">
                <td className="px-4 py-3 font-mono text-on-surface-variant">{folioLabel}</td>
                <td className="px-4 py-3">
                  {p.saleFolioCode ? (
                    <Link href={`/sales/${p.saleId}`} className="text-primary hover:underline">
                      {p.saleFolioCode}
                    </Link>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 max-w-[140px] truncate text-on-surface-variant">
                  {p.customerName ?? "—"}
                </td>
                <td className="px-4 py-3 max-w-[140px] truncate text-on-surface-variant">
                  {p.userName ?? "—"}
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{p.paymentMethodName ?? "—"}</td>
                {showBranch && (
                  <td className="px-4 py-3 text-on-surface-variant">{p.branchName ?? "—"}</td>
                )}
                <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(p.amount)}</td>
                <td className="px-4 py-3 text-on-surface-variant tabular-nums">{fmtDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/payments/${p.id}`}
                    className="text-label-sm text-primary hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
