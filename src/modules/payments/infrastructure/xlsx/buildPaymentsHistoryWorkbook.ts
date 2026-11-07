import * as XLSX from "xlsx";
import { PaymentHistoryReportDto, PaymentHistoryRowDto } from "../../application/dto/PaymentDto";

const STATUS_LABEL: Record<string, string> = {
  completed: "Completado",
  cancelled: "Cancelado",
};

function formatDate(iso: string): string {
  return iso.substring(0, 10);
}

/** Construye el workbook del historial de abonos agrupado por ticket — encabezado por venta + sus abonos + totales al final. */
export function buildPaymentsHistoryWorkbook(data: PaymentHistoryReportDto): Buffer {
  const rows: (string | number)[][] = [];

  const groups = new Map<string, PaymentHistoryRowDto[]>();
  for (const item of data.items) {
    // Account payments (saleId=null) each get their own group keyed by
    // their own id — never collapsed together under a shared "null" key.
    const key = item.saleId ?? `account:${item.id}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  for (const items of groups.values()) {
    const first = items[0];
    rows.push(
      first.saleId
        ? [
            `Ticket: ${first.saleFolioCode}`,
            `Cliente: ${first.customerName}`,
            `Monto total: ${first.saleTotal}`,
            `Saldo: ${first.saleDueAmount}`,
          ]
        : [`Abono a saldo general (sin ticket)`, `Cliente: ${first.customerName}`]
    );
    rows.push(["Fecha", "Folio recibo", "Cobrador", "Método", "Monto", "Estado"]);
    for (const item of items) {
      rows.push([
        formatDate(item.createdAt),
        item.folioCode,
        item.userName,
        item.paymentMethodCode,
        item.amount,
        STATUS_LABEL[item.status] ?? item.status,
      ]);
    }
    rows.push([]);
  }

  rows.push(["Total registros", data.totals.rowCount]);
  rows.push([`Completados (${data.totals.completedCount})`, data.totals.totalAmountCompleted]);
  rows.push([`Cancelados (${data.totals.cancelledCount})`, data.totals.totalAmountCancelled]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Historial de abonos");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
