"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { useTableKeyboard } from "../../../_hooks/useTableKeyboard";
import type { ProductDto } from "../_logic/types/api";

interface ProductCatalogTableProps {
  items: ProductDto[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: Error | null;
  onAddProduct: (product: ProductDto) => void;
  onPageChange: (page: number) => void;
}

export function ProductCatalogTable({
  items,
  total,
  page,
  pageSize,
  isLoading,
  error,
  onAddProduct,
  onPageChange,
}: ProductCatalogTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const [focusTarget, setFocusTarget] = useState<"first" | "last" | null>(null);
  const pageThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (pageThrottleRef.current) clearTimeout(pageThrottleRef.current); }, []);

  const onPageDown = useCallback(() => {
    if (page >= totalPages || pageThrottleRef.current) return;
    setFocusTarget("first");
    onPageChange(page + 1);
    pageThrottleRef.current = setTimeout(() => { pageThrottleRef.current = null; }, 150);
  }, [page, totalPages, onPageChange]);

  const onPageUp = useCallback(() => {
    if (page <= 1 || pageThrottleRef.current) return;
    setFocusTarget("last");
    onPageChange(page - 1);
    pageThrottleRef.current = setTimeout(() => { pageThrottleRef.current = null; }, 150);
  }, [page, onPageChange]);

  const { getRowProps, rowRefs, setFocusedIndex } = useTableKeyboard(items, onAddProduct, {
    onPageDown,
    onPageUp,
  });

  useEffect(() => {
    if (!focusTarget || items.length === 0) return;
    if (focusTarget === "first") {
      setFocusedIndex(0);
      rowRefs.current[0]?.focus();
    } else {
      const last = items.length - 1;
      setFocusedIndex(last);
      rowRefs.current[last]?.focus();
    }
    setFocusTarget(null);
  }, [items, focusTarget, setFocusedIndex, rowRefs]);

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
        <table className="w-full text-left text-body-md">
          <thead>
            <tr className="border-b border-outline-variant text-label-lg text-on-surface-variant">
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium hidden md:table-cell">Departamento</th>
              <th className="px-4 py-2 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((product, idx) => (
              <tr
                key={product.id}
                {...getRowProps(idx)}
                onClick={() => onAddProduct(product)}
                className="border-b border-outline-variant hover:bg-surface-container-low focus:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary transition-colors cursor-pointer"
              >
                <td className="px-4 py-2 font-mono text-label-lg text-on-surface-variant">{product.code}</td>
                <td className="px-4 py-2 text-body-sm font-medium">{product.name}</td>
                <td className="px-4 py-2 text-body-sm text-on-surface-variant hidden md:table-cell">
                  {product.departmentName ?? "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="inline-flex items-center gap-1 text-label-sm text-primary font-medium">
                    <Icon name="add" size={14} />
                    Añadir
                  </span>
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
