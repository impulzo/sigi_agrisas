"use client";

import { Icon } from "../../../_components/atoms/Icon/Icon";
import type { InventoryItem } from "../_logic/types/domain";

interface InventoryTableProps {
  items: InventoryItem[];
  canWrite: boolean;
  onAdjust: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onRemove: (item: InventoryItem) => void;
}

export function InventoryTable({ items, canWrite, onAdjust, onEdit, onRemove }: InventoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body-md">
        <thead>
          <tr className="border-b border-outline-variant text-label-lg text-on-surface-variant">
            <th className="px-4 py-3 font-medium">Código</th>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 font-medium text-right">Cantidad</th>
            <th className="px-4 py-3 font-medium text-right">Reservado</th>
            <th className="px-4 py-3 font-medium text-right">Disponible</th>
            <th className="px-4 py-3 font-medium text-right">P. reorden</th>
            {canWrite && <th className="px-4 py-3 font-medium">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const available = item.quantity - item.reservedQuantity;
            const isLow = item.quantity < item.reorderPoint;
            return (
              <tr key={item.id} className={`border-b border-outline-variant transition-colors ${isLow ? "bg-error-container/20 hover:bg-error-container/30" : "hover:bg-surface-container-low"}`}>
                <td className="px-4 py-3 font-mono text-label-lg">
                  <div className="flex items-center gap-2">
                    {isLow && <Icon name="warning" size={14} className="text-error flex-shrink-0" />}
                    {item.productCode}
                  </div>
                </td>
                <td className="px-4 py-3">{item.productName}</td>
                <td className="px-4 py-3 text-right font-medium">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-on-surface-variant">{item.reservedQuantity}</td>
                <td className={`px-4 py-3 text-right font-medium ${available <= 0 ? "text-error" : ""}`}>{available}</td>
                <td className="px-4 py-3 text-right text-on-surface-variant">{item.reorderPoint}</td>
                {canWrite && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onAdjust(item)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-label-sm text-primary hover:bg-primary/10 transition-colors" title="Ajustar stock">
                        <Icon name="tune" size={14} />Ajustar
                      </button>
                      <button type="button" onClick={() => onEdit(item)} className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant" title="Editar registro">
                        <Icon name="edit" size={14} />
                      </button>
                      <button type="button" onClick={() => onRemove(item)} className="p-1 rounded-lg hover:bg-error/10 text-error" title="Quitar de sucursal">
                        <Icon name="remove_circle" size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
