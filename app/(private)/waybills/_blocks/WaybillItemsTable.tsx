import { Skeleton } from "../../../_components/atoms/Skeleton/Skeleton";
import type { WaybillItem } from "../_logic/types/domain";

interface WaybillItemsTableProps {
  items: WaybillItem[];
  isLoading?: boolean;
}

export function WaybillItemsTable({ items, isLoading }: WaybillItemsTableProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={36} width="100%" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-medium">Código</th>
            <th className="px-4 py-3 text-left font-medium">Producto</th>
            <th className="px-4 py-3 text-left font-medium">Clave SAT transporte</th>
            <th className="px-4 py-3 text-left font-medium">Unidad SAT</th>
            <th className="px-4 py-3 text-right font-medium">Cant.</th>
            <th className="px-4 py-3 text-right font-medium">Peso (kg)</th>
            <th className="px-4 py-3 text-left font-medium">Peligroso</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-outline-variant/40 hover:bg-surface-container-low/50 transition-colors">
              <td className="px-4 py-3 font-mono text-label-sm text-on-surface-variant">
                {item.productCodeSnapshot ?? "—"}
              </td>
              <td className="px-4 py-3 text-on-surface">{item.productNameSnapshot}</td>
              <td className="px-4 py-3 font-mono text-label-sm text-on-surface-variant">{item.satBienesTranspCode}</td>
              <td className="px-4 py-3 text-on-surface-variant">{item.satUnitCode}</td>
              <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
              <td className="px-4 py-3 text-right tabular-nums">{item.weightKg}</td>
              <td className="px-4 py-3 text-on-surface-variant">
                {item.isHazardousMaterial ? `Sí (${item.hazardousMaterialCode ?? "—"})` : "No"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
