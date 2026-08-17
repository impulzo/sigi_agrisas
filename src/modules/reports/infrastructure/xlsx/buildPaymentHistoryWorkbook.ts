import * as XLSX from "xlsx";
import { PaymentHistoryReportResponseDto } from "../../application/dto/PaymentHistoryReportResponseDto";

const HEADER = [
  "Folio Recibo",
  "Folio Venta",
  "Cliente",
  "Sucursal",
  "Monto",
  "Fecha",
  "Estado",
];

/** Construye el workbook del historial de abonos — una fila por abono, hoja "Historial", más totales al final. */
export function buildPaymentHistoryWorkbook(data: PaymentHistoryReportResponseDto): Buffer {
  const rows: (string | number)[][] = [HEADER];

  for (const p of data.payments) {
    rows.push([
      p.folioNumber,
      p.saleFolioNumber,
      p.customerName,
      p.branchCode,
      p.amount,
      p.paymentDate,
      p.status === "completed" ? "Completado" : "Cancelado",
    ]);
  }

  rows.push([]);
  rows.push(["Abonos completados", data.summary.totalPayments]);
  rows.push(["Monto bruto", data.summary.totalAmount]);
  rows.push(["Abonos cancelados", data.summary.cancelledPayments]);
  rows.push(["Monto cancelado", data.summary.cancelledAmount]);
  rows.push(["Monto neto", data.summary.netAmount]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
