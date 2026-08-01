import * as XLSX from "xlsx";
import { CashCutReportResponseDto } from "../../application/dto/CashCutReportResponseDto";

const HEADER = [
  "Cte",
  "Docto",
  "Factura",
  "Nombre del cliente",
  "Fec-Fact",
  "Días",
  "Importe",
  "Fp",
  "Referencia",
  "F. Cobro",
  "I.V.A.",
  "Tasa%",
];

/** Construye el workbook del corte de caja — una fila por abono, hoja "Cobranza", más totales al final. */
export function buildCashCutWorkbook(data: CashCutReportResponseDto): Buffer {
  const rows: (string | number)[][] = [HEADER];

  for (const r of data.rows) {
    rows.push([
      r.customerCode,
      r.docto,
      r.factura,
      r.customerName,
      r.facturaDate,
      r.days,
      r.amount,
      r.paymentMethodName,
      r.reference ?? "",
      r.collectedAt,
      r.ivaAmount,
      r.taxRatePct,
    ]);
  }

  rows.push([]);
  rows.push(["Total cobrado", data.totals.totalCollected]);
  rows.push(["Total IVA", data.totals.totalIva]);
  rows.push([]);
  rows.push(["Desglose por forma de pago"]);
  rows.push(["Forma de pago", "Conteo", "Total"]);
  for (const b of data.byPaymentMethod) {
    rows.push([b.label, b.count, b.total]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cobranza");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
