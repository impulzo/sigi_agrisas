import * as XLSX from "xlsx";
import { AccountStatementSummaryResponseDto } from "../../application/dto/AccountStatementSummaryResponseDto";

const HEADER = ["Cliente", "Código", "Total cargado", "Total abonado", "Saldo", "Límite de crédito", "Disponible"];

export function buildAccountStatementsSummaryWorkbook(data: AccountStatementSummaryResponseDto): Buffer {
  const rows: (string | number)[][] = [HEADER];

  for (const r of data.items) {
    rows.push([
      r.customerName,
      r.customerCode,
      r.totalCharged,
      r.totalPaid,
      r.currentBalance,
      r.creditLimit ?? "Ilimitado",
      r.availableCredit ?? "Ilimitado",
    ]);
  }

  rows.push([]);
  rows.push(["Clientes", data.totals.customerCount]);
  rows.push(["Total cargado", data.totals.totalCharged]);
  rows.push(["Total abonado", data.totals.totalPaid]);
  rows.push(["Saldo total", data.totals.totalBalance]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Estados de Cuenta");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
