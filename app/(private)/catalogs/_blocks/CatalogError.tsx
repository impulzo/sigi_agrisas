import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";

interface CatalogErrorProps {
  onRetry: () => void;
}

export function CatalogError({ onRetry }: CatalogErrorProps) {
  return (
    <EmptyState
      icon="warning"
      title="Error al cargar"
      description="Ocurrió un error al obtener los datos."
      action={
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline text-label-lg text-on-surface font-medium hover:bg-surface-container-high transition-colors"
        >
          Reintentar
        </button>
      }
    />
  );
}
