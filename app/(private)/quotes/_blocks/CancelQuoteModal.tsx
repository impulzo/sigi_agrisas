"use client";

import { useState } from "react";
import Link from "next/link";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { QuoteAlreadyCancelledError, QuoteAlreadyConvertedError } from "../_logic/errors";
import type { CancelQuoteBody } from "../_logic/types/api";
import type { QuoteDetail } from "../_logic/types/domain";

interface CancelQuoteModalProps {
  quote: QuoteDetail;
  isSaving: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
  cancel: (id: string, body: CancelQuoteBody, onChange?: (q: QuoteDetail) => void) => Promise<void>;
}

export function CancelQuoteModal({
  quote,
  isSaving,
  onClose,
  onSuccess,
  onError,
  cancel,
}: CancelQuoteModalProps) {
  const [reason, setReason] = useState("");
  const [convertedSaleId, setConvertedSaleId] = useState<string | null>(null);

  async function handleSubmit() {
    try {
      await cancel(quote.id, { reason: reason.trim() || null }, () => onSuccess());
    } catch (err) {
      if (err instanceof QuoteAlreadyCancelledError) {
        onSuccess();
      } else if (err instanceof QuoteAlreadyConvertedError) {
        setConvertedSaleId(err.saleId);
      } else {
        onError((err as Error).message);
      }
    }
  }

  if (convertedSaleId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
          <h2 className="text-title-lg font-semibold text-on-surface">Cotización convertida</h2>
          <p className="text-body-md text-on-surface-variant">
            Esta cotización ya fue convertida a una venta. Para cancelarla, debes cancelar la venta generada.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-outline px-4 py-2 text-label-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Cerrar
            </button>
            <Link
              href={`/sales/${convertedSaleId}`}
              className="rounded-full bg-primary text-on-primary px-4 py-2 text-label-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Ir a la venta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <h2 className="text-title-lg font-semibold text-on-surface">Cancelar cotización</h2>
        <p className="text-body-sm text-on-surface-variant">
          Esta acción no se puede deshacer.
        </p>

        <div>
          <label className="text-label-sm text-on-surface-variant mb-1 block">
            Motivo <span className="text-on-surface-variant/60">(opcional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-outline px-4 py-2 text-label-lg text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-full bg-error text-on-error px-4 py-2 text-label-lg font-medium hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Spinner size="sm" />}
            Cancelar cotización
          </button>
        </div>
      </div>
    </div>
  );
}
