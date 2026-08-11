import * as XLSX from "xlsx";
import { PurchasesReportResponseDto } from "../../application/dto/PurchasesReportResponseDto";

const HEADER = [
  "Folio",
  "Proveedor",
  "Sucursal",
  "Subtotal",
  "Impuestos",
  "Total",
  "Pagado",
  "Estado pago",
  "Estado",
  "Fecha",
];

export function buildPurchasesReportWorkbook(data: PurchasesReportResponseDto): Buffer {
  const rows: (string | number)[][] = [HEADER];

  for (const r of data.rows) {
    rows.push([
      r.folioCode,
      r.providerName ?? "",
      r.branchName ?? "",
      r.subtotal,
      r.taxTotal,
      r.total,
      r.paidAmount,
      r.paymentStatus,
      r.status,
      r.purchasedAt,
    ]);
  }

  rows.push([]);
  rows.push(["Compras", data.totals.count]);
  rows.push(["Total", data.totals.total]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Compras");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
