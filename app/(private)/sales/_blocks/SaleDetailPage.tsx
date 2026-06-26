"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useHeadquarters } from "../../../_hooks/useHeadquarters";
import { useSaleDetail } from "../_logic/hooks/useSaleDetail";
import { useSaleMutations } from "../_logic/hooks/useSaleMutations";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { SalePaymentStatusBadge } from "./SalePaymentStatusBadge";
import { SaleItemsTable } from "./SaleItemsTable";
import { CancelSaleModal } from "./CancelSaleModal";
import { FullReturnModal } from "./FullReturnModal";
import { SaleReturnsSection } from "./SaleReturnsSection";
import { SalePaymentsSection } from "./SalePaymentsSection";
import { SaleInvoicesSection } from "../../billing/_blocks/SaleInvoicesSection";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../_components/atoms/Icon/Icon";

const MX = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});
function fmt(n: number) { return MX.format(n); }

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(d);
}

interface SaleDetailPageProps {
  id: string;
}

export function SaleDetailPage({ id }: SaleDetailPageProps) {
  const { can, branchId: userBranchId } = useCurrentUser();
  const { hq } = useHeadquarters();
  const { sale, isLoading, error, refresh } = useSaleDetail(id);
  const { isSaving, cancel } = useSaleMutations((updated) => {
    refresh();
  });

  const [showCancel, setShowCancel] = useState(false);
  const [showFullReturn, setShowFullReturn] = useState(false);

  const canCancel = can("sales:cancel");
  const canEditCompleted = can("sales:edit_completed");
  const canReturn = can("returns:create");
  const isBypass = can("branches:access_all");

  // Edit guard: must have permission AND (be in HQ branch OR have bypass)
  const isInHq = isBypass === true || (hq !== null && userBranchId === hq.id);
  const canEdit = canEditCompleted === true && isInHq;

  // Derived after sale is loaded — compute inside render after null check
  function hasRemainingItems(s: NonNullable<typeof sale>) {
    return s.items.some((item) => item.quantity > (s.returnedQuantityBySaleItem[item.id] ?? 0));
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <EmptyState
        icon="warning"
        title="No se encontró la venta"
        description={error?.message ?? "La venta no existe o no tienes acceso."}
        action={
          <Link href="/sales" className="text-primary hover:underline text-body-sm">
            Volver a ventas
          </Link>
        }
      />
    );
  }

  const folioLabel = sale.folioPrefix
    ? `${sale.folioPrefix}-${sale.folioNumber}`
    : String(sale.folioNumber);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/sales" className="text-on-surface-variant hover:text-on-surface">
              <Icon name="arrow_back" size={20} />
            </Link>
            <h1 className="text-headline-sm font-semibold text-on-surface font-mono">
              Folio {folioLabel}
            </h1>
            <SaleStatusBadge status={sale.status} />
            <SalePaymentStatusBadge status={sale.paymentStatus} isCredit={sale.isCredit} />
          </div>
          <p className="text-body-sm text-on-surface-variant pl-9">
            {fmtDate(sale.createdAt)}
          </p>
        </div>

        <div className="flex gap-2">
          {canReturn === true && sale.status === "completed" && hasRemainingItems(sale) && (
            <button
              type="button"
              onClick={() => setShowFullReturn(true)}
              className="rounded-full border border-error text-error px-4 py-2 text-body-sm font-medium hover:bg-error/5 transition-colors"
            >
              Devolución Total
            </button>
          )}
          {canCancel === true && sale.status !== "cancelled" && sale.status !== "returned_total" && (
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              className="rounded-full border border-error text-error px-4 py-2 text-body-sm font-medium hover:bg-error/5 transition-colors"
            >
              Cancelar venta
            </button>
          )}
          {canEdit && sale.status !== "cancelled" && sale.status !== "returned_total" && (
            <Link
              href={`/sales/${sale.id}/edit`}
              className="rounded-full bg-tertiary text-on-tertiary px-4 py-2 text-body-sm font-medium hover:bg-tertiary/90 transition-colors"
            >
              Editar venta
            </Link>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 bg-surface-container-low rounded-2xl p-4">
        <div>
          <p className="text-label-sm text-on-surface-variant">Cliente</p>
          <p className="text-body-sm text-on-surface">{sale.customerName ?? "—"}</p>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant">Sucursal</p>
          <p className="text-body-sm text-on-surface">{sale.branchName ?? "—"}</p>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant">Cajero</p>
          <p className="text-body-sm text-on-surface">{sale.cashierName ?? sale.cashierId.slice(0, 8)}</p>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant">Método de pago</p>
          <p className="text-body-sm text-on-surface">{sale.paymentMethodName ?? "—"}</p>
        </div>
      </div>

      {/* Items */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant">
          <h2 className="text-title-sm font-semibold text-on-surface">Artículos</h2>
        </div>
        <SaleItemsTable
          items={sale.items}
          returnedQuantityBySaleItem={sale.returnedQuantityBySaleItem}
        />
      </div>

      {/* Returns section */}
      <SaleReturnsSection
        saleId={sale.id}
        saleStatus={sale.status}
        saleItems={sale.items}
        returnedQuantityBySaleItem={sale.returnedQuantityBySaleItem}
      />

      {/* Invoices section */}
      <SaleInvoicesSection
        saleId={sale.id}
        saleStatus={sale.status}
        saleFolioLabel={folioLabel}
      />

      {/* Payments section — only for credit sales */}
      {sale.isCredit && (
        <SalePaymentsSection
          saleId={sale.id}
          sale={sale}
          onPaymentMutated={refresh}
        />
      )}

      {/* Totals */}
      <div className="flex justify-end">
        <div className="space-y-2 min-w-[240px]">
          <div className="flex justify-between text-body-sm">
            <span className="text-on-surface-variant">Subtotal</span>
            <span className="tabular-nums">{fmt(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between text-body-sm">
            <span className="text-on-surface-variant">Impuestos</span>
            <span className="tabular-nums">{fmt(sale.taxTotal)}</span>
          </div>
          <div className="flex justify-between text-title-sm font-semibold border-t border-outline-variant pt-2">
            <span>Total</span>
            <span className="tabular-nums">{fmt(sale.total)}</span>
          </div>
        </div>
      </div>

      {/* Cancellation / edit info */}
      {sale.status === "cancelled" && (
        <div className="bg-error-container text-on-error-container rounded-xl p-4 text-body-sm">
          <p className="font-medium mb-1">Venta cancelada el {fmtDate(sale.cancelledAt!)}</p>
          {sale.cancellationReason && (
            <p>Motivo: {sale.cancellationReason}</p>
          )}
        </div>
      )}

      {showCancel && (
        <CancelSaleModal
          sale={sale}
          isSaving={isSaving}
          onConfirm={async (reason) => {
            await cancel(sale.id, reason);
            setShowCancel(false);
          }}
          onClose={() => setShowCancel(false)}
        />
      )}

      {showFullReturn && (
        <FullReturnModal
          saleId={sale.id}
          onSuccess={() => {
            setShowFullReturn(false);
            refresh();
          }}
          onClose={() => setShowFullReturn(false)}
        />
      )}
    </div>
  );
}
