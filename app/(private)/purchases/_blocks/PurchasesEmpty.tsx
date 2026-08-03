import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";

export function PurchasesEmpty() {
  return (
    <EmptyState
      icon="shopping_cart"
      title="No hay compras"
      description="Aún no se han registrado compras con los filtros seleccionados."
    />
  );
}
