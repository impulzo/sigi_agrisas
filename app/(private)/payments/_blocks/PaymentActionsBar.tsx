"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { CancelPaymentModal } from "./CancelPaymentModal";
import type { PaymentDetail } from "../_logic/types/domain";

interface PaymentActionsBarProps {
  payment: PaymentDetail;
  onCancelled: () => void;
}

export function PaymentActionsBar({ payment, onCancelled }: PaymentActionsBarProps) {
  const { can } = useCurrentUser();
  const canCancel = can("payments:cancel");
  const [showCancel, setShowCancel] = useState(false);

  if (payment.status !== "completed" || canCancel !== true) return null;

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setShowCancel(true)}
        className="rounded-full border border-error text-error px-4 py-2 text-body-sm font-medium hover:bg-error/5 transition-colors"
      >
        Cancelar abono
      </button>

      {showCancel && (
        <CancelPaymentModal
          paymentId={payment.id}
          onSuccess={() => {
            setShowCancel(false);
            onCancelled();
          }}
          onClose={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}
