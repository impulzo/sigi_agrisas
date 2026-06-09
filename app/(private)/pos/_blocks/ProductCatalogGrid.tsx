"use client";

import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { formatMxCurrency } from "../_logic/lib/formatMxCurrency";
import type { ProductDto } from "../_logic/types/api";

interface ProductCatalogGridProps {
  items: ProductDto[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: Error | null;
  onAddProduct: (product: ProductDto) => void;
  onPageChange: (page: number) => void;
}

export function ProductCatalogGrid({
  items,
  total,
  page,
  pageSize,
  isLoading,
  error,
  onAddProduct,
  onPageChange,
}: ProductCatalogGridProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-body-sm text-error">
        Error al cargar productos. Intenta de nuevo.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-body-sm text-on-surface-variant">
        Sin productos
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-medium">Código</th>
              <th className="px-3 py-2 text-left font-medium">Producto</th>
              <th className="px-3 py-2 text-right font-medium">Precio</th>
              <th className="px-3 py-2 text-right font-medium sr-only">Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((product) => (
              <tr
                key={product.id}
                className="border-b border-outline-variant/40 hover:bg-surface-container-low transition-colors"
              >
                <td className="px-3 py-2 font-mono text-label-sm">{product.code}</td>
                <td className="px-3 py-2 max-w-[200px] truncate">{product.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                  —
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onAddProduct(product)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-1 text-label-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Icon name="add" size={16} />
                    Añadir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-outline-variant">
          <span className="text-label-sm text-on-surface-variant">
            {total} productos
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded disabled:opacity-40 hover:bg-surface-container transition-colors"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <span className="text-label-sm tabular-nums">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded disabled:opacity-40 hover:bg-surface-container transition-colors"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
