import Link from "next/link";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";

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
      {canCreate && (
        <Link
          href="/quotes/new"
          className="rounded-full bg-secondary-container text-on-secondary-container px-4 py-2 text-label-lg font-medium hover:bg-secondary-container/80 transition-colors"
        >
          Nueva cotización
        </Link>
      )}
    </div>
  );
}
