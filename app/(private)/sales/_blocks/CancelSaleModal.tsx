"use client";

import { useState } from "react";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { SaleStatusBadge } from "./SaleStatusBadge";
import type { SaleDetail } from "../_logic/types/domain";

interface CancelSaleModalProps {
  sale: SaleDetail;
  isSaving: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

export function CancelSaleModal({ sale, isSaving, onConfirm, onClose }: CancelSaleModalProps) {
  const [reason, setReason] = useState("");

  // Idempotent: already cancelled
  if (sale.status === "cancelled") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
          <h2 className="text-title-md font-semibold text-on-surface mb-3">Venta ya cancelada</h2>
          <div className="space-y-2 text-body-sm text-on-surface-variant mb-6">
            <div className="flex items-center gap-2">
              <span>Estado:</span>
              <SaleStatusBadge status="cancelled" />
            </div>
            {sale.cancellationReason && (
              <p>Motivo: {sale.cancellationReason}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-primary py-2 text-body-sm font-medium text-on-primary"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="text-title-md font-semibold text-on-surface mb-2">Cancelar venta</h2>
        <p className="text-body-sm text-on-surface-variant mb-4">
          Esta acción cancelará la venta y restaurará el stock. No se puede deshacer.
        </p>

        <div className="mb-4">
          <label className="text-label-sm text-on-surface-variant mb-1 block">
            Motivo de cancelación (opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Describe el motivo de la cancelación..."
            className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-label-sm text-on-surface-variant text-right mt-0.5">
            {reason.length}/500
          </p>
        </div>

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
            onClick={() => onConfirm(reason.trim() || undefined)}
            disabled={isSaving}
            className="flex-1 rounded-full bg-error py-2 text-body-sm font-medium text-on-error hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving && <Spinner size="sm" />}
            Confirmar cancelación
          </button>
        </div>
      </div>
    </div>
  );
}
