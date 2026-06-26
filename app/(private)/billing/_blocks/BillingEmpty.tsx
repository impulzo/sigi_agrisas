"use client";

import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";

export function BillingEmpty() {
  return (
    <EmptyState
      icon="receipt_long"
      title="No hay facturas"
      description="No se encontraron facturas con los filtros aplicados."
    />
  );
}
