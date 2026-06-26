"use client";

import type { InvoiceStatus } from "../_logic/types/domain";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  if (status === "stamped") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-label-sm font-medium">
        Vigente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-label-sm font-medium">
      Cancelada
    </span>
  );
}
