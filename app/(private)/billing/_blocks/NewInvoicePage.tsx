"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { SegmentedButton } from "../../../_components/molecules/SegmentedButton/SegmentedButton";
import { StampSaleForm } from "./StampSaleForm";
import { PartialInvoiceForm } from "./PartialInvoiceForm";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";

type Mode = "sale" | "partial";

interface NewInvoicePageProps {
  initialSaleId?: string;
  initialSaleLabel?: string;
}

export function NewInvoicePage({ initialSaleId, initialSaleLabel }: NewInvoicePageProps) {
  const { can } = useCurrentUser();
  const canWrite = can("billing:write");

  const [mode, setMode] = useState<Mode>(initialSaleId ? "sale" : "sale");

  if (canWrite === "loading") {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (canWrite === false) {
    return <EmptyState icon="block" title="Sin acceso" description="No tienes permiso para emitir facturas." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-headline-sm font-semibold text-on-surface mb-1">Nueva factura</h1>
        <p className="text-body-md text-on-surface-variant">Selecciona el tipo de factura a emitir.</p>
      </div>

      <SegmentedButton<Mode>
        value={mode}
        options={[
          { value: "sale", label: "Facturar venta", icon: "receipt_long" },
          { value: "partial", label: "Factura parcial", icon: "receipt_long" },
        ]}
        onChange={setMode}
        aria-label="Tipo de factura"
      />

      <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
        {mode === "sale" ? (
          <StampSaleForm initialSaleId={initialSaleId} initialSaleLabel={initialSaleLabel} />
        ) : (
          <PartialInvoiceForm />
        )}
      </div>
    </div>
  );
}
