"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { usePaymentsHistory } from "../_logic/hooks/usePaymentsHistory";
import { useBranchesOptions } from "../../inventory/_logic/hooks/useBranchesOptions";
import { CatalogPagination } from "../../catalogs/_blocks/CatalogPagination";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { PaymentsHistoryToolbar } from "./PaymentsHistoryToolbar";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import type { PaymentStatus } from "../_logic/types/domain";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function fmt(n: number) { return MX.format(n); }
function fmtDate(s: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short" }).format(new Date(s));
}

export function PaymentsHistoryPage() {
  const { can } = useCurrentUser();
  const canReport = can("payments:report_read");
  const isBypass = can("branches:access_all");
  const { options: branchOptions } = useBranchesOptions();
  const branches = branchOptions.map((b) => ({ id: b.id, name: b.name }));

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [userId, setUserId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [toastError, setToastError] = useState<string | null>(null);

  const { report, isLoading, error, isExporting, exportPdf } = usePaymentsHistory({
    page,
    pageSize,
    userId: userId || undefined,
    customerId: customerId || undefined,
    productId: productId || undefined,
    paymentMethodId: paymentMethodId || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    branchId: branchId || undefined,
  });

  async function handleExportPdf() {
    setToastError(null);
    try {
      await exportPdf();
    } catch (err) {
      if (err instanceof Error) {
        setToastError(err.message);
      }
    }
  }

  function handleReset() {
    setUserId("");
    setCustomerId("");
    setProductId("");
    setPaymentMethodId("");
    setStatus("");
    setFrom("");
    setTo("");
    setBranchId("");
    setPage(1);
  }

  if (canReport === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (canReport === false) {
    return (
      <EmptyState
        icon="block"
        title="Sin acceso"
        description="No tienes permiso para ver el historial de abonos."
      />
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/payments" className="text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" size={20} />
        </Link>
        <h1 className="text-headline-sm font-semibold text-on-surface">Historial de abonos</h1>
      </div>

      <PaymentsHistoryToolbar
        userId={userId}
        onUserIdChange={(v) => { setUserId(v); setPage(1); }}
        customerId={customerId}
        onCustomerIdChange={(v) => { setCustomerId(v); setPage(1); }}
        productId={productId}
        onProductIdChange={(v) => { setProductId(v); setPage(1); }}
        paymentMethodId={paymentMethodId}
        onPaymentMethodIdChange={(v) => { setPaymentMethodId(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        from={from}
        onFromChange={(v) => { setFrom(v); setPage(1); }}
        to={to}
        onToChange={(v) => { setTo(v); setPage(1); }}
        branchId={branchId}
        onBranchIdChange={(v) => { setBranchId(v); setPage(1); }}
        branches={branches}
        isExporting={isExporting}
        onExportPdf={handleExportPdf}
        onReset={handleReset}
      />

      {error && (
        <div className="bg-error-container/20 rounded-xl px-4 py-3 text-body-sm text-error">
          {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : !report || report.items.length === 0 ? (
        <EmptyState
          icon="payments"
          title="Sin resultados"
          description="No se encontraron abonos con los filtros seleccionados."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-low">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Folio recibo</th>
                  <th className="px-4 py-3 text-left font-medium">Folio venta</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Cobrador</th>
                  <th className="px-4 py-3 text-left font-medium">Método</th>
                  {isBypass === true && <th className="px-4 py-3 text-left font-medium">Sucursal</th>}
                  <th className="px-4 py-3 text-right font-medium">Monto</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((p) => {
                  const folioLabel = p.folioPrefix
                    ? `${p.folioPrefix}${p.folioNumber}`
                    : String(p.folioNumber);
                  return (
                    <tr key={p.id} className="border-b border-outline-variant/40 hover:bg-surface-container-low/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-on-surface-variant">{folioLabel}</td>
                      <td className="px-4 py-3">
                        {p.saleFolioCode ? (
                          <Link href={`/sales/${p.saleId}`} className="text-primary hover:underline">
                            {p.saleFolioCode}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[140px] truncate text-on-surface-variant">{p.customerName ?? "—"}</td>
                      <td className="px-4 py-3 max-w-[140px] truncate text-on-surface-variant">{p.userName ?? "—"}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{p.paymentMethodName ?? "—"}</td>
                      {isBypass === true && (
                        <td className="px-4 py-3 text-on-surface-variant">{p.branchName ?? "—"}</td>
                      )}
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(Number(p.amount))}</td>
                      <td className="px-4 py-3 text-on-surface-variant tabular-nums">{fmtDate(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-outline-variant bg-surface-container font-medium">
                  <td colSpan={isBypass === true ? 6 : 5} className="px-4 py-3 text-label-sm text-on-surface-variant">
                    Totales — {report.completedCount} completados / {report.cancelledCount} cancelados
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <div className="text-green-700">{fmt(Number(report.totalAmountCompleted))}</div>
                    <div className="text-on-surface-variant text-label-sm">{fmt(Number(report.totalAmountCancelled))} canc.</div>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          <CatalogPagination
            page={page}
            pageSize={pageSize}
            total={report.total}
            count={report.items.length}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
          />
        </>
      )}

      {toastError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-5 py-3 rounded-full text-body-sm shadow-lg z-50"
        >
          {toastError}
        </div>
      )}
    </div>
  );
}
