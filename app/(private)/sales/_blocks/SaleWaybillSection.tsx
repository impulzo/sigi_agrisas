"use client";

import Link from "next/link";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";

interface SaleWaybillSectionProps {
  saleId: string;
  saleStatus: "completed" | "cancelled" | "edited" | "returned_total";
  customerId?: string | null;
}

export function SaleWaybillSection({ saleId, saleStatus, customerId }: SaleWaybillSectionProps) {
  const { can } = useCurrentUser();
  const canWrite = can("waybills:write");

  const showCta = saleStatus === "completed" && !!customerId && canWrite === true;

  if (!showCta) return null;

  return (
    <div className="bg-surface-container-low rounded-lg border border-outline-variant overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <h2 className="text-title-sm font-semibold text-on-surface">Carta Porte</h2>
        <Link
          href={`/sales/${saleId}/waybill/new`}
          className="rounded-full bg-primary text-on-primary px-4 py-1.5 text-label-md font-medium hover:bg-primary/90 transition-colors"
        >
          + Generar Carta Porte
        </Link>
      </div>
    </div>
  );
}
