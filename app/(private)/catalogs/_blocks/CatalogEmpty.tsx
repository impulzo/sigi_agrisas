import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";

interface CatalogEmptyProps {
  canWrite?: boolean;
  onCreate?: () => void;
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function CatalogEmpty({ canWrite, onCreate, filtered, onClearFilters }: CatalogEmptyProps) {
  if (filtered) {
    return (
      <EmptyState
        icon="search"
        title="Ningún elemento coincide con los filtros"
        action={
          onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-label-lg text-primary underline underline-offset-2"
            >
              Limpiar filtros
            </button>
          )
        }
      />
    );
  }
  return (
    <EmptyState
      icon="category"
      title="No hay elementos en este catálogo"
      description="Comienza agregando el primer elemento."
      action={
        canWrite && onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 transition-opacity"
          >
            Crear el primero
          </button>
        ) : undefined
      }
    />
  );
}
