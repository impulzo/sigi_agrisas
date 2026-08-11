import { GetProviderPaymentsReportUseCase } from "@/modules/reports/application/use-cases/GetProviderPaymentsReportUseCase";
import {
  InMemoryProviderPaymentReportRepository,
  InMemProviderPayment,
} from "@/modules/reports/infrastructure/repositories/InMemoryProviderPaymentReportRepository";

const GEN = { userId: "u1", email: "op@test.com" };

function payment(over: Partial<InMemProviderPayment> = {}): InMemProviderPayment {
  return {
    id: "pp-1",
    folioCode: "CP-000001",
    purchaseFolioCode: "COM-000001",
    providerName: "Proveedor Uno",
    branchName: "Matriz",
    amount: 500,
    status: "completed",
    paidAt: new Date("2026-06-10T00:00:00.000Z"),
    branchId: "b1",
    providerId: "prov1",
    ...over,
  };
}

const req = (over = {}) => ({
  branchId: null, providerId: null, status: null, from: null, to: null,
  page: 1, pageSize: 20, forExport: false, generatedBy: GEN, ...over,
});

function base(payments: InMemProviderPayment[]) {
  return new GetProviderPaymentsReportUseCase(new InMemoryProviderPaymentReportRepository(payments));
}

describe("GetProviderPaymentsReportUseCase", () => {
  it("sin filtros → lista todos los pagos", async () => {
    const { dto, tooLarge } = await base([payment()]).execute(req());
    expect(tooLarge).toBe(false);
    expect(dto.rows).toHaveLength(1);
    expect(dto.rows[0].purchaseFolioCode).toBe("COM-000001");
    expect(dto.totals.total).toBe("500.0000");
  });

  it("filtra por estado", async () => {
    const { dto } = await base([
      payment({ id: "a", status: "completed" }),
      payment({ id: "b", status: "cancelled" }),
    ]).execute(req({ status: "cancelled" }));
    expect(dto.rows).toHaveLength(1);
    expect(dto.rows[0].id).toBe("b");
  });

  it("filtra por proveedor", async () => {
    const { dto } = await base([
      payment({ id: "a", providerId: "x", amount: 100 }),
      payment({ id: "b", providerId: "y", amount: 200 }),
    ]).execute(req({ providerId: "x" }));
    expect(dto.rows).toHaveLength(1);
    expect(dto.totals.total).toBe("100.0000");
  });

  it("sin pagos en el periodo → array vacío", async () => {
    const { dto } = await base([]).execute(req());
    expect(dto.rows).toHaveLength(0);
  });
});
