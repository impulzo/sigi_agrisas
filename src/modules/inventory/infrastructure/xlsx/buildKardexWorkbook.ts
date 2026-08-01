import * as XLSX from "xlsx";
import { KardexReportResponseDto } from "../../application/dto/KardexReportResponseDto";
import { MOVEMENT_TYPE_LABELS, InventoryMovementType } from "../../domain/entities/InventoryMovement";

const HEADER = [
  "Fecha",
  "Hora",
  "Cliente",
  "Prov",
  "Movimiento",
  "Serie",
  "Folio",
  "Cantidad",
  "Unidad",
  "Factor",
  "Entrada",
  "Salida",
  "Saldo",
  "Costo",
  "Venta",
  "Ser Origen",
  "Fol Origen",
  "Status",
];

function splitDateTime(iso: string): { date: string; time: string } {
  const [date, timePart] = iso.split("T");
  return { date, time: (timePart ?? "").substring(0, 8) };
}

function folioLabel(code: string | null, number: number | null): string {
  if (!code) return "";
  return number !== null ? `${code}${number}` : code;
}

/** Builds the kardex workbook — one row per movement, one sheet named "Kardex". */
export function buildKardexWorkbook(data: KardexReportResponseDto): Buffer {
  const rows: (string | number)[][] = [HEADER];

  for (const m of data.movements) {
    const { date, time } = splitDateTime(m.movementAt);
    rows.push([
      date,
      time,
      m.customerId ?? "",
      m.providerId ?? "",
      MOVEMENT_TYPE_LABELS[m.movementType as InventoryMovementType],
      m.serie ?? "",
      folioLabel(m.folioCode, m.folioNumber),
      m.entrada || m.salida,
      m.unit,
      m.factor,
      m.entrada || "",
      m.salida || "",
      m.saldo,
      m.unitCost ?? "",
      m.unitPrice ?? "",
      "",
      folioLabel(m.originFolioCode, m.originFolioNumber),
      m.status,
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
