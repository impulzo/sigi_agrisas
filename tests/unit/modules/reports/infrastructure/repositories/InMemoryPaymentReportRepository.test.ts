import { Decimal } from "decimal.js";
import { InMemoryPaymentReportRepository } from "@/modules/reports/infrastructure/repositories/InMemoryPaymentReportRepository";
import { RawPaymentRow } from "@/modules/reports/application/ports/PaymentReportRepository";

function makeRow(overrides: Partial<RawPaymentRow> & { paymentId: string }): RawPaymentRow {
  return {
    paymentId: overrides.paymentId,
    folioNumber: overrides.folioNumber ?? "RECIBO-001",
    saleId: overrides.saleId ?? "sale-1",
    saleFolioNumber: overrides.saleFolioNumber ?? "VNT-001",
    customerId: overrides.customerId ?? "cust-1",
    customerCode: overrides.customerCode ?? "CUST001",
    customerName: overrides.customerName ?? "Cliente Test",
    branchId: overrides.branchId ?? "branch-1",
    branchCode: overrides.branchCode ?? "MATRIZ",
    amount: overrides.amount ?? new Decimal("500"),
    paymentDate: overrides.paymentDate ?? new Date("2026-06-01T10:00:00Z"),
    status: overrides.status ?? "completed",
    registeredBy: overrides.registeredBy ?? "user-1",
    registeredByEmail: overrides.registeredByEmail ?? "op@test.com",
    cancelledAt: overrides.cancelledAt ?? null,
    cancellationReason: overrides.cancellationReason ?? null,
  };
}

describe("InMemoryPaymentReportRepository", () => {
  const rows = [
    makeRow({ paymentId: "p1", branchId: "branch-1", customerId: "cust-1", paymentDate: new Date("2026-06-01T10:00:00Z") }),
    makeRow({ paymentId: "p2", branchId: "branch-1", customerId: "cust-2", paymentDate: new Date("2026-06-05T10:00:00Z") }),
    makeRow({ paymentId: "p3", branchId: "branch-2", customerId: "cust-1", paymentDate: new Date("2026-06-10T10:00:00Z") }),
  ];

  it("sin filtros devuelve todas las filas", async () => {
    const repo = new InMemoryPaymentReportRepository(rows);
    const result = await repo.findPayments({});
    expect(result).toHaveLength(3);
  });

  it("filtra por branchId", async () => {
    const repo = new InMemoryPaymentReportRepository(rows);
    const result = await repo.findPayments({ branchId: "branch-1" });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.branchId === "branch-1")).toBe(true);
  });

  it("filtra por customerId", async () => {
    const repo = new InMemoryPaymentReportRepository(rows);
    const result = await repo.findPayments({ customerId: "cust-1" });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.customerId === "cust-1")).toBe(true);
  });

  it("filtra por startDate", async () => {
    const repo = new InMemoryPaymentReportRepository(rows);
    const result = await repo.findPayments({ startDate: new Date("2026-06-03T00:00:00Z") });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.paymentId)).toEqual(expect.arrayContaining(["p2", "p3"]));
  });

  it("filtra por endDate", async () => {
    const repo = new InMemoryPaymentReportRepository(rows);
    const result = await repo.findPayments({ endDate: new Date("2026-06-07T00:00:00Z") });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.paymentId)).toEqual(expect.arrayContaining(["p1", "p2"]));
  });

  it("filtra por rango startDate + endDate", async () => {
    const repo = new InMemoryPaymentReportRepository(rows);
    const result = await repo.findPayments({
      startDate: new Date("2026-06-02T00:00:00Z"),
      endDate: new Date("2026-06-07T00:00:00Z"),
    });
    expect(result).toHaveLength(1);
    expect(result[0].paymentId).toBe("p2");
  });
});
