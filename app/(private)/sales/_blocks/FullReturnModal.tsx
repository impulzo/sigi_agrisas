"use client";

import { useState } from "react";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { fullReturnSale } from "../_logic/services/fullReturnSale";
import { SaleAlreadyFullyReturnedError } from "../_logic/errors";

interface FullReturnModalProps {
  saleId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function FullReturnModal({ saleId, onSuccess, onClose }: FullReturnModalProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonError = reason.trim().length > 0 && reason.trim().length < 3
    ? "El motivo es obligatorio (mín. 3 caracteres)"
    : null;

  async function handleConfirm() {
    if (reason.trim().length < 3) {
      setError("El motivo es obligatorio (mín. 3 caracteres)");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await fullReturnSale(saleId, {
        reason: reason.trim(),
        notes: notes.trim() || null,
      });
      onSuccess();
    } catch (err) {
      if (err instanceof SaleAlreadyFullyReturnedError) {
        setError("Esta venta ya fue devuelta en su totalidad");
      } else {
        setError("Ocurrió un error al procesar la devolución. Intenta de nuevo.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="text-title-md font-semibold text-on-surface mb-2">Devolución total</h2>
        <p className="text-body-sm text-on-surface-variant mb-4">
          Se devolverán todas las líneas restantes del ticket al inventario.
        </p>

        <div className="mb-4">
          <label className="text-label-sm text-on-surface-variant mb-1 block">
            Motivo <span className="text-error">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Describe el motivo de la devolución..."
            className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="flex justify-between items-center mt-0.5">
            {reasonError && (
              <p className="text-label-sm text-error">{reasonError}</p>
            )}
            <p className="text-label-sm text-on-surface-variant ml-auto">{reason.length}/500</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-label-sm text-on-surface-variant mb-1 block">
            Notas adicionales (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Información adicional..."
            className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-label-sm text-on-surface-variant text-right mt-0.5">{notes.length}/1000</p>
        </div>

        {error && (
          <p className="mb-4 text-label-sm text-error">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-full border border-outline py-2 text-body-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving || reason.trim().length < 3}
            className="flex-1 rounded-full bg-error py-2 text-body-sm font-medium text-on-error hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving && <Spinner size="sm" />}
            Confirmar devolución total
          </button>
        </div>
      </div>
    </div>
  );
}
