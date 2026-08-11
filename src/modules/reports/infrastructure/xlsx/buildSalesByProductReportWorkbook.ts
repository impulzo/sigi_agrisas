import * as XLSX from "xlsx";
import { SalesByProductReportResponseDto } from "../../application/dto/SalesByProductReportResponseDto";

const BREAKDOWN_HEADER = ["Nombre", "Tickets", "Subtotal", "Impuestos", "Total"];
const PRODUCT_HEADER = ["Producto", "Tickets", "Piezas vendidas", "Stock actual", "Subtotal", "Impuestos", "Total"];

export function buildSalesByProductReportWorkbook(data: SalesByProductReportResponseDto): Buffer {
  const workbook = XLSX.utils.book_new();

  const customerRows: (string | number)[][] = [BREAKDOWN_HEADER];
  for (const r of data.byCustomer) {
    customerRows.push([r.label, r.ticketCount, r.subtotal, r.taxTotal, r.total]);
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(customerRows), "Por Cliente");

  const departmentRows: (string | number)[][] = [BREAKDOWN_HEADER];
  for (const r of data.byDepartment) {
    departmentRows.push([r.label, r.ticketCount, r.subtotal, r.taxTotal, r.total]);
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(departmentRows), "Por Departamento");

  const productRows: (string | number)[][] = [PRODUCT_HEADER];
  for (const r of data.byProduct) {
    productRows.push([r.label, r.ticketCount, r.quantitySold, r.currentStock, r.subtotal, r.taxTotal, r.total]);
  }
  productRows.push([]);
  productRows.push(["Tickets", data.totals.ticketCount]);
  productRows.push(["Total", data.totals.total]);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(productRows), "Por Producto");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
