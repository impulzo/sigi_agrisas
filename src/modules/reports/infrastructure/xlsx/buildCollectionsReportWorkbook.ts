import * as XLSX from "xlsx";
import { CollectionsReportResponseDto } from "../../application/dto/CollectionsReportResponseDto";

const DETAIL_HEADER = ["Cliente", "Ticket", "Forma de pago", "Importe", "Referencia", "Fecha de cobro"];
const CUSTOMER_HEADER = ["Cliente", "Código", "Abonos", "Total"];
const TICKET_HEADER = ["Ticket", "Cliente", "Abonos", "Total"];

export function buildCollectionsReportWorkbook(data: CollectionsReportResponseDto): Buffer {
  const workbook = XLSX.utils.book_new();

  const detailRows: (string | number)[][] = [DETAIL_HEADER];
  for (const r of data.rows) {
    detailRows.push([r.customerName, r.factura, r.paymentMethodName, r.amount, r.reference ?? "", r.collectedAt]);
  }
  detailRows.push([]);
  detailRows.push(["Total cobrado", data.totals.totalCollected]);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(detailRows), "Detalle");

  const customerRows: (string | number)[][] = [CUSTOMER_HEADER];
  for (const r of data.byCustomer) {
    customerRows.push([r.customerName, r.customerCode, r.count, r.total]);
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(customerRows), "Por Cliente");

  const ticketRows: (string | number)[][] = [TICKET_HEADER];
  for (const r of data.byTicket) {
    ticketRows.push([r.factura, r.customerName, r.count, r.total]);
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(ticketRows), "Por Ticket");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
