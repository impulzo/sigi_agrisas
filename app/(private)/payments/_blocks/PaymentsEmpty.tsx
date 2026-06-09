import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";

export function PaymentsEmpty() {
  return (
    <EmptyState
      icon="payments"
      title="Sin abonos"
      description="No se encontraron abonos con los filtros seleccionados."
    />
  );
}
