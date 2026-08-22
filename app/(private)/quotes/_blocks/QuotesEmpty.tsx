import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { CreateButton } from "../../../_components/molecules/CreateButton/CreateButton";

interface QuotesEmptyProps {
  onRefresh?: () => void;
  canCreate?: boolean;
}

export function QuotesEmpty({ canCreate = false }: QuotesEmptyProps) {
  return (
    <div className="py-8 flex flex-col items-center gap-4">
      <EmptyState
        icon="request_quote"
        title="Sin cotizaciones"
        description="No se encontraron cotizaciones con los filtros actuales."
      />
      {canCreate && <CreateButton label="Nueva cotización" href="/quotes/new" />}
    </div>
  );
}
