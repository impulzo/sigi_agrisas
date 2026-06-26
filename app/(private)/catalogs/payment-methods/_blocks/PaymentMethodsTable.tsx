"use client";

import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { Skeleton } from "../../../../_components/atoms/Skeleton/Skeleton";
import { CatalogStatusBadge } from "../../_blocks/CatalogStatusBadge";
import type { PaymentMethod } from "../_logic/types/domain";
import { useTableKeyboard } from "../../../../_hooks/useTableKeyboard";

interface PaymentMethodsTableProps {
  items: PaymentMethod[];
  canWrite: boolean;
  isLoading?: boolean;
  onEdit: (item: PaymentMethod) => void;
  onSoftDelete: (id: string) => void;
  onReactivate: (id: string) => void;
  onEnter?: (item: PaymentMethod) => void;
}

export function PaymentMethodsTable({
  items,
  canWrite,
  isLoading,
  onEdit,
  onSoftDelete,
  onReactivate,
  onEnter,
}: PaymentMethodsTableProps) {
  const noop = () => {};
  const { getRowProps } = useTableKeyboard(items, onEnter ?? noop);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={56} className="w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-md">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container">
            <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant font-medium">Código</th>
            <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant font-medium">Nombre</th>
            <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant font-medium">Descripción</th>
            <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant font-medium">Estado</th>
            {canWrite && (
              <th className="text-right px-4 py-3 text-label-lg text-on-surface-variant font-medium">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id}
              {...getRowProps(idx)}
              className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low focus:bg-surface-container focus:outline-none transition-colors cursor-default"
            >
              <td className="px-4 py-3 font-mono text-on-surface">{item.code}</td>
              <td className="px-4 py-3 text-on-surface">{item.name}</td>
              <td className="px-4 py-3 text-on-surface-variant">
                {item.description ? (
                  <span title={item.description}>
                    {item.description.length > 60
                      ? item.description.slice(0, 60) + "…"
                      : item.description}
                  </span>
                ) : (
                  <span>—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <CatalogStatusBadge isActive={item.isActive} />
              </td>
              {canWrite && (
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {item.isActive ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          title="Editar"
                          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                        >
                          <Icon name="edit" size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSoftDelete(item.id)}
                          title="Desactivar"
                          className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onReactivate(item.id)}
                        title="Reactivar"
                        className="p-2 rounded-lg text-on-surface-variant hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                      >
                        <Icon name="restore" size={18} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
