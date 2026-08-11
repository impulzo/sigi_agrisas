import * as XLSX from "xlsx";
import { AccountStatementLedgerResponseDto } from "../../application/dto/AccountStatementLedgerResponseDto";

const HEADER = [
  "Fecha",
  "Tipo",
  "Serie",
  "Factura",
  "Vencimiento",
  "Referencia",
  "F.Pgo",
  "Cargo",
  "Abono",
  "Saldo acumulado",
  "Estado",
];

export function buildAccountStatementLedgerWorkbook(data: AccountStatementLedgerResponseDto): Buffer {
  const rows: (string | number)[][] = [HEADER];

  for (const m of data.movements) {
    rows.push([
      m.date,
      m.type,
      m.serie,
      m.factura,
      m.dueDate ?? "",
      m.reference ?? "",
      m.paymentMethodCode ?? "",
      m.debit,
      m.credit,
      m.runningBalance,
      m.status,
    ]);
  }

  rows.push([]);
  rows.push(["Cliente", data.customer.name]);
  rows.push(["Saldo inicial", data.openingBalance]);
  rows.push(["Saldo final", data.closingBalance]);
  rows.push(["Movimientos", data.totals.movementCount]);
  rows.push(["Total cargos", data.totals.totalDebit]);
  rows.push(["Total abonos", data.totals.totalCredit]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Libro Mayor");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
