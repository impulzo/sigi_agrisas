import * as XLSX from "xlsx";
import { SalesByProductReportResponseDto } from "../../application/dto/SalesByProductReportResponseDto";

const HEADER = ["Departamento", "Producto", "Cliente", "Cantidad", "Monto"];

export function buildSalesByProductReportWorkbook(data: SalesByProductReportResponseDto): Buffer {
  const rows: (string | number)[][] = [HEADER];

  for (const r of data.rows) {
    rows.push([r.departmentName, `${r.productName} (${r.productCode})`, r.customerName, r.quantity, r.total]);
  }

  rows.push([]);
  rows.push(["Tickets", data.totals.ticketCount]);
  rows.push(["Total", data.totals.total]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Detalle");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
