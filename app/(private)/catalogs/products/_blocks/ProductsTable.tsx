"use client";

import Link from "next/link";
import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { ProductImage } from "../../../../_components/atoms/ProductImage/ProductImage";
import { CatalogStatusBadge } from "../../_blocks/CatalogStatusBadge";
import type { Product } from "../_logic/types/domain";
import { useTableKeyboard } from "../../../../_hooks/useTableKeyboard";

function formatTaxRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(0)}%`;
}

interface ProductsTableProps {
  items: Product[];
  canWrite: boolean;
  onEdit: (entity: Product) => void;
  onManage: (entity: Product) => void;
  onDelete: (entity: Product) => void;
  onReactivate: (entity: Product) => void;
  onEnter?: (item: Product) => void;
}

export function ProductsTable({
  items,
  canWrite,
  onEdit,
  onManage,
  onDelete,
  onReactivate,
  onEnter,
}: ProductsTableProps) {
  const noop = () => {};
  const { getRowProps } = useTableKeyboard(items, onEnter ?? noop);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body-md">
        <thead>
          <tr className="border-b border-outline-variant text-label-lg text-on-surface-variant">
            <th className="px-4 py-3 font-medium w-12"></th>
            <th className="px-4 py-3 font-medium">Código</th>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Departamento</th>
            <th className="px-4 py-3 font-medium">Proveedor</th>
            <th className="px-4 py-3 font-medium">Tasa</th>
            <th className="px-4 py-3 font-medium">Unidad</th>
            <th className="px-4 py-3 font-medium text-right">IVA</th>
            <th className="px-4 py-3 font-medium text-right">IEPS</th>
            <th className="px-4 py-3 font-medium">Sujeto a impuestos</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id}
              {...getRowProps(idx)}
              className="border-b border-outline-variant hover:bg-surface-container-low focus:bg-surface-container focus:outline-none transition-colors cursor-default"
            >
              <td className="px-2 py-2">
                <ProductImage src={item.imageUrl ?? null} alt={item.name} size={40} />
              </td>
              <td className="px-4 py-3 font-mono text-label-lg">{item.code}</td>
              <td className="px-4 py-3">{item.name}</td>
              <td className="px-4 py-3 text-on-surface-variant">{item.departmentName}</td>
              <td className="px-4 py-3 text-on-surface-variant">{item.providerName ?? "—"}</td>
              <td className="px-4 py-3 font-mono text-on-surface-variant text-label-sm">{item.taxRateCode ?? "—"}</td>
              <td className="px-4 py-3 text-on-surface-variant">{item.unit}</td>
              <td className="px-4 py-3 text-right">{formatTaxRate(item.ivaRate)}</td>
              <td className="px-4 py-3 text-right">{formatTaxRate(item.iepsRate)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium ${item.isTaxable ? "bg-tertiary-container text-on-tertiary-container" : "bg-surface-container-high text-on-surface-variant"}`}>
                  {item.isTaxable ? "Sí" : "No"}
                </span>
              </td>
              <td className="px-4 py-3">
                <CatalogStatusBadge isActive={item.isActive} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/catalogs/products/${item.id}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-label-sm text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Icon name="open_in_new" size={14} />
                    Gestionar
                  </Link>
                  {canWrite && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                        title="Editar"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      {item.isActive ? (
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-label-sm text-error hover:bg-error/10 transition-colors"
                          title="Desactivar"
                        >
                          <Icon name="block" size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReactivate(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-label-sm text-primary hover:bg-primary/10 transition-colors"
                          title="Reactivar"
                        >
                          <Icon name="check_circle" size={14} />
                          Reactivar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
