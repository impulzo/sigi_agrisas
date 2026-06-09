"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../../../../../_hooks/useCurrentUser";
import { useSaleDetail } from "../../../../_logic/hooks/useSaleDetail";
import { useCreateReturnForm } from "../../../../../returns/_logic/hooks/useCreateReturnForm";
import { SaleItemsTable } from "../../../../_blocks/SaleItemsTable";
import { CreateReturnFooter } from "./CreateReturnFooter";
import { ReturnLineRow } from "./ReturnLineRow";
import { EmptyState } from "../../../../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../../../../_components/atoms/Icon/Icon";
import { SaleNotReturnableError } from "../../../../../returns/_logic/errors";
import type { ReactNode } from "react";
import type { SaleItem } from "../../../../_logic/types/domain";

interface CreateReturnPageProps {
  saleId: string;
}

export function CreateReturnPage({ saleId }: CreateReturnPageProps) {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canCreate = can("returns:create");

  const { sale, isLoading, error, refresh } = useSaleDetail(saleId);

  const form = useCreateReturnForm(
    sale,
    (ret) => {
      router.push(`/returns/${ret.id}`);
    },
    (_saleItemId) => {
      refresh();
    },
  );

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
        title="Venta no encontrada"
        description={error?.message ?? "No se encontró la venta."}
        action={<Link href={`/sales/${saleId}`} className="text-primary hover:underline text-body-sm">Volver al ticket</Link>}
      />
    );
  }

  if (canCreate === false) {
    return (
      <EmptyState
        icon="block"
        title="Sin acceso"
        description="No tienes permiso para registrar devoluciones."
        action={<Link href={`/sales/${saleId}`} className="text-primary hover:underline text-body-sm">Volver al ticket</Link>}
      />
    );
  }

  if (sale.status !== "completed") {
    return (
      <EmptyState
        icon="assignment_return"
        title="Esta venta no acepta devoluciones"
        description={`Solo se pueden devolver ventas completadas. Estado actual: ${sale.status}.`}
        action={<Link href={`/sales/${saleId}`} className="text-primary hover:underline text-body-sm">Volver al ticket</Link>}
      />
    );
  }

  const folioLabel = sale.folioPrefix
    ? `${sale.folioPrefix}-${sale.folioNumber}`
    : String(sale.folioNumber);

  async function handleSubmit() {
    try {
      await form.submit();
    } catch (err) {
      if (err instanceof SaleNotReturnableError) {
        router.push(`/sales/${saleId}`);
      }
    }
  }

  function renderQuantityCell(item: SaleItem, returnedQty: number): ReactNode {
    const line = form.lines.find((l) => l.saleItemId === item.id);
    if (!line) return null;
    return (
      <ReturnLineRow
        item={item}
        returnedQty={returnedQty}
        value={line.quantity}
        error={line.error}
        onChange={(qty) => form.updateLine(item.id, qty)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/sales/${saleId}`} className="text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" size={20} />
        </Link>
        <h1 className="text-headline-sm font-semibold text-on-surface">
          Registrar devolución — Folio {folioLabel}
        </h1>
      </div>

      {/* Items table with quantity inputs */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant">
          <h2 className="text-title-sm font-semibold text-on-surface">
            Selecciona los artículos a devolver
          </h2>
        </div>
        <SaleItemsTable
          items={sale.items}
          returnedQuantityBySaleItem={sale.returnedQuantityBySaleItem}
          renderQuantityCell={renderQuantityCell}
        />
      </div>

      {/* Footer form */}
      <CreateReturnFooter
        reason={form.reason}
        onReasonChange={form.setReason}
        returnedAt={form.returnedAt}
        onReturnedAtChange={form.setReturnedAt}
        notes={form.notes}
        onNotesChange={form.setNotes}
        validationError={form.validationError}
        isSubmitting={form.isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
