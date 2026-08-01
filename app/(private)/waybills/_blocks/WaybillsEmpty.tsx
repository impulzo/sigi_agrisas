import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";

export function WaybillsEmpty() {
  return (
    <EmptyState
      icon="swap_horiz"
      title="No hay traspasos"
      description="Aún no se han registrado traspasos entre sucursales con los filtros seleccionados."
    />
  );
}
