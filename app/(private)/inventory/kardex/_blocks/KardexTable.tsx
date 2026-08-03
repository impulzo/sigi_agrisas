import { MOVEMENT_TYPE_LABELS } from "../_logic/lib/movementTypeLabels";
import type { KardexMovementDto } from "../_logic/types/api";

interface KardexTableProps {
  movements: KardexMovementDto[];
}

function formatDateTime(iso: string): string {
  return iso.substring(0, 16).replace("T", " ");
}

function folioLabel(code: string | null, number: number | null): string {
  if (!code) return "—";
  return number !== null ? `${code}${number}` : code;
}

export function KardexTable({ movements }: KardexTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
            <th className="px-3 py-2 font-medium">Fecha</th>
            <th className="px-3 py-2 font-medium">Movimiento</th>
            <th className="px-3 py-2 font-medium">Folio</th>
            <th className="px-3 py-2 font-medium text-right">Entrada</th>
            <th className="px-3 py-2 font-medium text-right">Salida</th>
            <th className="px-3 py-2 font-medium text-right">Saldo</th>
            <th className="px-3 py-2 font-medium text-right">Costo</th>
            <th className="px-3 py-2 font-medium text-right">Venta</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Concepto</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m, idx) => (
            <tr key={idx} className="border-b border-outline-variant">
              <td className="px-3 py-2 font-mono">{formatDateTime(m.movementAt)}</td>
              <td className="px-3 py-2">{MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}</td>
              <td className="px-3 py-2 font-mono">{folioLabel(m.folioCode, m.folioNumber)}</td>
              <td className="px-3 py-2 text-right">{m.entrada || ""}</td>
              <td className="px-3 py-2 text-right">{m.salida || ""}</td>
              <td className="px-3 py-2 text-right font-medium">{m.saldo}</td>
              <td className="px-3 py-2 text-right text-on-surface-variant">{m.unitCost ?? "—"}</td>
              <td className="px-3 py-2 text-right text-on-surface-variant">{m.unitPrice ?? "—"}</td>
              <td className="px-3 py-2">{m.status}</td>
              <td className="px-3 py-2 text-on-surface-variant">{m.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
