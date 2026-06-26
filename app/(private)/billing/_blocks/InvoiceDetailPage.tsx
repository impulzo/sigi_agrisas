"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useInvoiceDetail } from "../_logic/hooks/useInvoiceDetail";
import { useInvoiceMutations } from "../_logic/hooks/useInvoiceMutations";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceMetaPanel } from "./InvoiceMetaPanel";
import { InvoiceActionsBar } from "./InvoiceActionsBar";
import { CancelInvoiceModal } from "./CancelInvoiceModal";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { InvoiceNotFoundError, BillingForbiddenError } from "../_logic/errors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function fmt(n: number) { return MX.format(n); }

interface InvoiceDetailPageProps { id: string; }

export function InvoiceDetailPage({ id }: InvoiceDetailPageProps) {
  const { can } = useCurrentUser();
  const canCancel = can("billing:cancel");

  const isValidId = UUID_RE.test(id);
  const { invoice, isLoading, error, refresh } = useInvoiceDetail(isValidId ? id : "__skip__");

  const { isSaving, isDownloading, mutationError, clearError, cancel, download } = useInvoiceMutations((updated) => {
    void updated;
    refresh();
  });

  const [showCancel, setShowCancel] = useState(false);

  if (!isValidId) {
    return (
      <EmptyState
        icon="warning"
        title="ID inválido"
        description="El identificador de la factura no es válido."
        action={<Link href="/billing" className="text-primary hover:underline text-body-sm">Volver a facturas</Link>}
      />
    );
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (error) {
    if (error instanceof InvoiceNotFoundError) {
      return (
        <EmptyState
          icon="receipt_long"
          title="Factura no encontrada"
          description="Esta factura no existe o fue eliminada."
          action={<Link href="/billing" className="text-primary hover:underline text-body-sm">Volver a facturas</Link>}
        />
      );
    }
    if (error instanceof BillingForbiddenError) {
      return (
        <EmptyState
          icon="block"
          title="Sin acceso"
          description="No tienes permiso para ver esta factura."
          action={<Link href="/billing" className="text-primary hover:underline text-body-sm">Volver a facturas</Link>}
        />
      );
    }
    return <EmptyState icon="warning" title="Error al cargar la factura" description={error.message} />;
  }

  if (!invoice) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/billing" className="text-on-surface-variant hover:text-on-surface">
              <Icon name="arrow_back" size={20} />
            </Link>
            <h1 className="text-headline-sm font-semibold text-on-surface font-mono truncate max-w-xs" title={invoice.uuid ?? undefined}>
              {invoice.uuid ? invoice.uuid.slice(0, 18) + "…" : `Factura #${invoice.id.slice(-8).toUpperCase()}`}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <div className="pl-9 flex items-center gap-2 text-body-sm text-on-surface-variant">
            {invoice.saleId && (
              <Link href={`/sales/${invoice.saleId}`} className="text-primary hover:underline">
                Ver venta origen
              </Link>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-label-sm text-on-surface-variant">Total facturado</p>
          <p className="text-display-sm font-bold tabular-nums text-on-surface">{fmt(invoice.total)}</p>
        </div>
      </div>

      {/* Mutation error banner */}
      {mutationError && (
        <div className="rounded-xl bg-error-container/30 border border-error/30 px-4 py-3 flex items-start justify-between gap-2">
          <p className="text-body-sm text-error">{mutationError.message}</p>
          <button type="button" onClick={clearError} className="text-error text-label-sm hover:underline flex-shrink-0">Cerrar</button>
        </div>
      )}

      {/* Items */}
      {invoice.items && invoice.items.length > 0 && (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant">
            <h2 className="text-title-sm font-semibold text-on-surface">Conceptos</h2>
          </div>
          <InvoiceItemsTable
            items={invoice.items}
            subtotal={invoice.subtotal}
            taxTotal={invoice.taxTotal}
            total={invoice.total}
          />
        </div>
      )}

      {/* Meta */}
      <InvoiceMetaPanel invoice={invoice} />

      {/* Actions */}
      <InvoiceActionsBar
        invoice={invoice}
        canCancel={canCancel}
        isDownloading={isDownloading}
        isSaving={isSaving}
        onDownload={(format) => download(invoice.id, format)}
        onCancelClick={() => setShowCancel(true)}
      />

      {showCancel && (
        <CancelInvoiceModal
          invoiceId={invoice.id}
          open={showCancel}
          onClose={() => setShowCancel(false)}
          onSuccess={() => { setShowCancel(false); refresh(); }}
        />
      )}
    </div>
  );
}
