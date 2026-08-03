"use client";

import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import type { PurchaseDetail } from "../_logic/types/domain";

interface PurchaseActionsBarProps {
  purchase: PurchaseDetail;
  canCancel: boolean | "loading";
  onCancelClick: () => void;
}

export function PurchaseActionsBar({ purchase, canCancel, onCancelClick }: PurchaseActionsBarProps) {
  if (purchase.status !== "completed") return null;
  if (canCancel === false) return null;

  const hasActiveProviderPayments = purchase.providerPayments.some((pp) => pp.status === "completed");

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onCancelClick}
        disabled={canCancel === "loading" || hasActiveProviderPayments}
        title={hasActiveProviderPayments ? "Cancela primero los abonos activos de esta compra" : undefined}
        className="inline-flex items-center gap-2 rounded-full bg-error-container text-on-error-container px-4 py-2 text-body-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {canCancel === "loading" && <Spinner size="sm" />}
        Cancelar compra
      </button>
      {hasActiveProviderPayments && (
        <p className="text-label-sm text-on-surface-variant">
          Esta compra tiene abonos activos; cancélalos primero.
        </p>
      )}
    </div>
  );
}
