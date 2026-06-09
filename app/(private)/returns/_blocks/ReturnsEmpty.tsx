import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";

export function ReturnsEmpty() {
  return (
    <EmptyState
      icon="assignment_return"
      title="No hay devoluciones"
      description="Aún no se han registrado devoluciones con los filtros seleccionados."
    />
  );
}
