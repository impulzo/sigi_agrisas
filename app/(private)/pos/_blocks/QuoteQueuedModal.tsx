"use client";

import { useEffect, useRef } from "react";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { Button } from "../../../_components/atoms/Button/Button";
import { formatMxCurrency } from "../_logic/lib/formatMxCurrency";
import type { OutboxQuoteRecord } from "../../../_lib/offline/db";

interface QuoteQueuedModalProps {
  queued: OutboxQuoteRecord;
  onNewQuote: () => void;
}

/** Shown instead of a redirect to `/quotes/:id` when a quote was created offline
 * and has no real id yet — the real detail page becomes reachable once synced. */
export function QuoteQueuedModal({ queued, onNewQuote }: QuoteQueuedModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const itemsCount = (queued.payload.items as unknown[] | undefined)?.length ?? 0;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      onNewQuote();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl text-center backdrop:bg-black/40"
    >
      <div className="flex justify-center mb-4">
        <span className="text-5xl text-secondary">
          <Icon name="sync" size={64} />
        </span>
      </div>

      <h2 className="text-title-md font-semibold text-on-surface mb-1">
        Cotización guardada — pendiente de sincronizar
      </h2>

      <p className="text-body-sm text-on-surface-variant mb-4">
        Ticket <strong className="font-mono">{queued.provisionalCode}</strong>
      </p>

      <div className="mb-4 rounded-md bg-secondary-container/40 text-on-secondary-container px-4 py-2 text-body-sm text-left">
        Sin conexión: se sincronizará automáticamente al reconectar. Podrás verla en el
        panel de sincronización mientras tanto.
      </div>

      <div className="space-y-2 mb-6 text-left bg-surface-container-low rounded-md p-4">
        <div className="flex justify-between text-body-sm">
          <span className="text-on-surface-variant">Total</span>
          <span className="font-semibold tabular-nums text-on-surface">
            {formatMxCurrency(queued.localTotal)}
          </span>
        </div>
        <div className="flex justify-between text-body-sm">
          <span className="text-on-surface-variant">Artículos</span>
          <span className="text-on-surface">{itemsCount}</span>
        </div>
      </div>

      <Button type="button" onClick={onNewQuote} autoFocus className="w-full">
        Nueva cotización
      </Button>
    </dialog>
  );
}
