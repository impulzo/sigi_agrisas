import { Icon } from "../../../_components/atoms/Icon/Icon";

interface CatalogPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  count: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (ps: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function CatalogPagination({
  page,
  pageSize,
  total,
  count,
  onPageChange,
  onPageSizeChange,
}: CatalogPaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + count;
  const hasPrev = page > 1;
  const hasNext = to < total;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-outline-variant">
      <span className="text-body-md text-on-surface-variant">
        Mostrando {from}–{to} de {total}
      </span>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="catalog-page-size-select">
            Por página:
          </label>
          <select
            id="catalog-page-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            aria-label="Página anterior"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icon name="chevron_left" size={20} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            aria-label="Página siguiente"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
