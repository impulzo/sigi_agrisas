"use client";

import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import type { ReturnDetail } from "../_logic/types/domain";

interface ReturnActionsBarProps {
  ret: ReturnDetail;
  canCancel: boolean | "loading";
  onCancelClick: () => void;
}

export function ReturnActionsBar({ ret, canCancel, onCancelClick }: ReturnActionsBarProps) {
  if (ret.status !== "completed") return null;
  if (canCancel === false) return null;

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onCancelClick}
        disabled={canCancel === "loading"}
        className="inline-flex items-center gap-2 rounded-full bg-error-container text-on-error-container px-4 py-2 text-body-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {canCancel === "loading" && <Spinner size="sm" />}
        Cancelar devolución
      </button>
    </div>
  );
}
