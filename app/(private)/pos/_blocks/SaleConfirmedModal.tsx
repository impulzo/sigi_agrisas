"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { formatMxCurrency } from "../_logic/lib/formatMxCurrency";
import type { SaleDetailDto } from "../_logic/types/api";
import type { OutboxSaleRecord } from "../../../_lib/offline/db";

interface SaleConfirmedModalProps {
  /** Present for a synced (online or already-synced offline) sale. */
  sale?: SaleDetailDto | null;
  /** Present instead of `sale` while the sale is queued offline, not yet synced. */
  queued?: OutboxSaleRecord | null;
  onNewSale: () => void;
}

export function SaleConfirmedModal({ sale, queued, onNewSale }: SaleConfirmedModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const newSaleBtnRef = useRef<HTMLButtonElement>(null);

  const isQueued = !sale && Boolean(queued);
  const folioLabel = isQueued
    ? queued!.provisionalCode
    : sale?.folioPrefix
      ? `${sale.folioPrefix}-${sale.folioNumber}`
      : String(sale?.folioNumber ?? "");
  const itemsCount = isQueued
    ? ((queued!.payload.items as unknown[] | undefined)?.length ?? 0)
    : sale?.items.length ?? 0;
  const total = isQueued ? queued!.localTotal : sale?.total ?? 0;

  useEffect(() => {
    dialogRef.current?.showModal();
    newSaleBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onNewSale();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onNewSale]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      onNewSale();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl text-center backdrop:bg-black/40"
    >
      <div className="flex justify-center mb-4">
        <span className={isQueued ? "text-5xl text-secondary" : "text-5xl text-primary"}>
          <Icon name={isQueued ? "sync" : "check_circle"} size={64} />
        </span>
      </div>

      <h2 className="text-title-md font-semibold text-on-surface mb-1">
        {isQueued ? "Venta guardada — pendiente de sincronizar" : "¡Venta registrada!"}
      </h2>

      <p className="text-body-sm text-on-surface-variant mb-4">
        {isQueued ? "Ticket" : "Folio"} <strong className="font-mono">{folioLabel}</strong>
      </p>

      {isQueued && (
        <div className="mb-4 rounded-md bg-secondary-container/40 text-on-secondary-container px-4 py-2 text-body-sm text-left">
          Sin conexión: el folio fiscal definitivo se asignará al sincronizar y puede no
          seguir el orden cronológico de venta. No cierres ni borres datos de este
          navegador hasta sincronizar.
        </div>
      )}

      {!isQueued && sale?.creditLimitExceeded === true && (
        <div className="mb-4 rounded-md bg-error/10 text-error px-4 py-2 text-body-sm text-left">
          Se ha excedido el límite de crédito establecido para este cliente.
        </div>
      )}

      <div className="space-y-2 mb-6 text-left bg-surface-container-low rounded-md p-4">
        <div className="flex justify-between text-body-sm">
          <span className="text-on-surface-variant">Total</span>
          <span className="font-semibold tabular-nums text-on-surface">
            {formatMxCurrency(total)}
          </span>
        </div>
        {!isQueued && sale?.customerName && (
          <div className="flex justify-between text-body-sm">
            <span className="text-on-surface-variant">Cliente</span>
            <span className="text-on-surface">{sale.customerName}</span>
          </div>
        )}
        <div className="flex justify-between text-body-sm">
          <span className="text-on-surface-variant">Artículos</span>
          <span className="text-on-surface">{itemsCount}</span>
        </div>
      </div>

      <p className="text-label-sm text-on-surface-variant mb-4">
        Esc o Enter para nueva venta
      </p>

      <div className="flex gap-3">
        <button
          ref={newSaleBtnRef}
          type="button"
          onClick={onNewSale}
          className="flex-1 rounded-full border border-outline py-2 text-body-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
        >
          Nueva venta
        </button>
        {!isQueued && sale && (
          <button
            type="button"
            onClick={() => router.push(`/sales/${sale.id}`)}
            className="flex-1 rounded-full bg-primary py-2 text-body-sm font-medium text-on-primary hover:bg-primary/90 transition-colors"
          >
            Ver ticket
          </button>
        )}
      </div>
    </dialog>
  );
}
