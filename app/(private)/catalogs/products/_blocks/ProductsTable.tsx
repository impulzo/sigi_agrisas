"use client";

import Link from "next/link";
import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { CatalogStatusBadge } from "../../_blocks/CatalogStatusBadge";
import type { Product } from "../_logic/types/domain";

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
}

export function ProductsTable({
  items,
  canWrite,
  onEdit,
  onManage,
  onDelete,
  onReactivate,
}: ProductsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body-md">
        <thead>
          <tr className="border-b border-outline-variant text-label-lg text-on-surface-variant">
            <th className="px-4 py-3 font-medium">Código</th>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Departamento</th>
            <th className="px-4 py-3 font-medium">Unidad</th>
            <th className="px-4 py-3 font-medium text-right">IVA</th>
            <th className="px-4 py-3 font-medium text-right">IEPS</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
              <td className="px-4 py-3 font-mono text-label-lg">{item.code}</td>
              <td className="px-4 py-3">{item.name}</td>
              <td className="px-4 py-3 text-on-surface-variant">{item.departmentName}</td>
              <td className="px-4 py-3 text-on-surface-variant">{item.unit}</td>
              <td className="px-4 py-3 text-right">{formatTaxRate(item.ivaRate)}</td>
              <td className="px-4 py-3 text-right">{formatTaxRate(item.iepsRate)}</td>
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
