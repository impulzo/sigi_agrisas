import * as XLSX from "xlsx";
import { ProviderPaymentsReportResponseDto } from "../../application/dto/ProviderPaymentsReportResponseDto";

const HEADER = ["Folio pago", "Folio compra", "Proveedor", "Sucursal", "Monto", "Estado", "Fecha"];

export function buildProviderPaymentsReportWorkbook(data: ProviderPaymentsReportResponseDto): Buffer {
  const rows: (string | number)[][] = [HEADER];

  for (const r of data.rows) {
    rows.push([
      r.folioCode,
      r.purchaseFolioCode,
      r.providerName ?? "",
      r.branchName ?? "",
      r.amount,
      r.status,
      r.paidAt,
    ]);
  }

  rows.push([]);
  rows.push(["Pagos", data.totals.count]);
  rows.push(["Total", data.totals.total]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pagos a Proveedores");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
