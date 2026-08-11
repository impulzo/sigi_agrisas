import * as XLSX from "xlsx";
import { buildPaymentsHistoryWorkbook } from "@/modules/payments/infrastructure/xlsx/buildPaymentsHistoryWorkbook";
import { PaymentHistoryReportDto, PaymentHistoryRowDto } from "@/modules/payments/application/dto/PaymentDto";

function makeRow(overrides: Partial<PaymentHistoryRowDto> = {}): PaymentHistoryRowDto {
  return {
    id: "pay-1",
    createdAt: "2026-06-05T10:00:00.000Z",
    folioCode: "RECIBO-000001",
    saleId: "sale-1",
    saleFolioCode: "VNT-000001",
    customerId: "cust-1",
    customerName: "Acme S.A.",
    userId: "user-1",
    userName: "Juan Pérez",
    branchId: "branch-1",
    branchName: "Matriz",
    paymentMethodCode: "EFECTIVO",
    amount: "300.0000",
    status: "completed",
    cancelledAt: null,
    saleTotal: "1000.0000",
    salePaidAmount: "300.0000",
    salePaymentStatus: "partial",
    saleDueAmount: "700.0000",
    ...overrides,
  };
}

function makeReport(items: PaymentHistoryRowDto[]): PaymentHistoryReportDto {
  return {
    generatedAt: "2026-06-06T00:00:00.000Z",
    generatedBy: { userId: "user-1", email: "admin@test.com" },
    filters: {
      userId: null,
      saleId: null,
      customerId: null,
      productId: null,
      paymentMethodId: null,
      status: ["completed", "cancelled"],
      from: null,
      to: null,
      branchId: null,
    },
    items,
    totals: {
      rowCount: items.length,
      completedCount: items.filter((i) => i.status === "completed").length,
      cancelledCount: items.filter((i) => i.status === "cancelled").length,
      totalAmountCompleted: "500.0000",
      totalAmountCancelled: "0.0000",
    },
    page: 1,
    pageSize: items.length,
    total: items.length,
  };
}

function sheetRows(buffer: Buffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets["Historial de abonos"];
  return XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
}

describe("buildPaymentsHistoryWorkbook", () => {
  it("groups rows by ticket with a header per sale", () => {
    const report = makeReport([
      makeRow({ id: "pay-1", saleId: "sale-1", saleFolioCode: "VNT-000001", amount: "300.0000" }),
      makeRow({ id: "pay-2", saleId: "sale-1", saleFolioCode: "VNT-000001", amount: "200.0000" }),
      makeRow({ id: "pay-3", saleId: "sale-2", saleFolioCode: "VNT-000002", customerName: "Otro Cliente", amount: "100.0000" }),
    ]);

    const buffer = buildPaymentsHistoryWorkbook(report);
    const rows = sheetRows(buffer);
    const flat = rows.map((r) => r.join(" ")).join("\n");

    expect(flat).toContain("Ticket: VNT-000001");
    expect(flat).toContain("Ticket: VNT-000002");
    expect(flat).toContain("Otro Cliente");
  });

  it("includes global totals section at the end", () => {
    const report = makeReport([makeRow()]);
    const buffer = buildPaymentsHistoryWorkbook(report);
    const rows = sheetRows(buffer);
    const flat = rows.map((r) => r.join(" ")).join("\n");

    expect(flat).toContain("Total registros");
    expect(flat).toContain("Completados (1)");
  });

  it("produces a valid xlsx buffer for an empty report", () => {
    const report = makeReport([]);
    const buffer = buildPaymentsHistoryWorkbook(report);
    const rows = sheetRows(buffer);

    expect(rows.length).toBeGreaterThan(0);
  });
});
