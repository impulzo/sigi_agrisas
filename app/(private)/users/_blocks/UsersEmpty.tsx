import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";

interface UsersEmptyProps {
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function UsersEmpty({ filtered, onClearFilters }: UsersEmptyProps) {
  if (filtered) {
    return (
      <EmptyState
        icon="search"
        title="Ningún usuario coincide con los filtros"
        action={
          <button
            type="button"
            onClick={onClearFilters}
            className="text-label-lg text-primary underline underline-offset-2"
          >
            Limpiar filtros
          </button>
        }
      />
    );
  }
  return <EmptyState icon="group" title="No hay usuarios" description="Aún no se han registrado usuarios en el sistema." />;
}
