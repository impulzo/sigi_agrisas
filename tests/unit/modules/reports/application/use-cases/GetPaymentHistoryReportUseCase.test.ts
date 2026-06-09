import { Decimal } from "decimal.js";
import { GetPaymentHistoryReportUseCase } from "@/modules/reports/application/use-cases/GetPaymentHistoryReportUseCase";
import { InMemoryPaymentReportRepository } from "@/modules/reports/infrastructure/repositories/InMemoryPaymentReportRepository";
import { RawPaymentRow } from "@/modules/reports/application/ports/PaymentReportRepository";

const GENERATED_BY = { userId: "user-1", email: "admin@test.com" };

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
    amount: overrides.amount ?? new Decimal("500.0000"),
    paymentDate: overrides.paymentDate ?? new Date("2026-06-01T10:00:00Z"),
    status: overrides.status ?? "completed",
    registeredBy: overrides.registeredBy ?? "user-1",
    registeredByEmail: overrides.registeredByEmail ?? "op@test.com",
    cancelledAt: overrides.cancelledAt ?? null,
    cancellationReason: overrides.cancellationReason ?? null,
  };
}

describe("GetPaymentHistoryReportUseCase", () => {
  it("calcula summary correctamente con mix completed/cancelled", async () => {
    const rows = [
      makeRow({ paymentId: "p1", amount: new Decimal("1000"), status: "completed" }),
      makeRow({ paymentId: "p2", amount: new Decimal("500"), status: "completed" }),
      makeRow({ paymentId: "p3", amount: new Decimal("200"), status: "cancelled" }),
    ];
    const repo = new InMemoryPaymentReportRepository(rows);
    const uc = new GetPaymentHistoryReportUseCase(repo);

    const dto = await uc.execute({ generatedBy: GENERATED_BY });

    expect(dto.summary.totalPayments).toBe(2);
    expect(dto.summary.totalAmount).toBe("1500.0000");
    expect(dto.summary.cancelledPayments).toBe(1);
    expect(dto.summary.cancelledAmount).toBe("200.0000");
    expect(dto.summary.netAmount).toBe("1300.0000");
  });

  it("netAmount = totalAmount - cancelledAmount", async () => {
    const rows = [
      makeRow({ paymentId: "p1", amount: new Decimal("5000"), status: "completed" }),
      makeRow({ paymentId: "p2", amount: new Decimal("200"), status: "cancelled" }),
    ];
    const repo = new InMemoryPaymentReportRepository(rows);
    const uc = new GetPaymentHistoryReportUseCase(repo);

    const dto = await uc.execute({ generatedBy: GENERATED_BY });

    expect(dto.summary.netAmount).toBe("4800.0000");
  });

  it("filtra por customerId", async () => {
    const rows = [
      makeRow({ paymentId: "p1", customerId: "cust-1" }),
      makeRow({ paymentId: "p2", customerId: "cust-2" }),
    ];
    const repo = new InMemoryPaymentReportRepository(rows);
    const uc = new GetPaymentHistoryReportUseCase(repo);

    const dto = await uc.execute({ customerId: "cust-1", generatedBy: GENERATED_BY });

    expect(dto.payments).toHaveLength(1);
    expect(dto.payments[0].paymentId).toBe("p1");
  });

  it("filtra por rango de fechas", async () => {
    const rows = [
      makeRow({ paymentId: "p1", paymentDate: new Date("2026-06-01T10:00:00Z") }),
      makeRow({ paymentId: "p2", paymentDate: new Date("2026-06-08T10:00:00Z") }),
    ];
    const repo = new InMemoryPaymentReportRepository(rows);
    const uc = new GetPaymentHistoryReportUseCase(repo);

    const dto = await uc.execute({
      startDate: new Date("2026-06-01T00:00:00Z"),
      endDate: new Date("2026-06-07T00:00:00Z"),
      generatedBy: GENERATED_BY,
    });

    expect(dto.payments).toHaveLength(1);
    expect(dto.payments[0].paymentId).toBe("p1");
  });

  it("payments: [] con summary en cero cuando no hay filas", async () => {
    const repo = new InMemoryPaymentReportRepository([]);
    const uc = new GetPaymentHistoryReportUseCase(repo);

    const dto = await uc.execute({ generatedBy: GENERATED_BY });

    expect(dto.payments).toHaveLength(0);
    expect(dto.summary.totalPayments).toBe(0);
    expect(dto.summary.totalAmount).toBe("0.0000");
    expect(dto.summary.netAmount).toBe("0.0000");
  });
});
