import { GetCashCutReportUseCase } from "@/modules/reports/application/use-cases/GetCashCutReportUseCase";
import {
  InMemoryCashCutRepository,
  InMemCutPayment,
} from "@/modules/reports/infrastructure/repositories/InMemoryCashCutRepository";

const GEN = { userId: "u1", email: "op@test.com" };
const FROM = new Date("2026-06-01T00:00:00.000Z");
const TO = new Date("2026-06-30T00:00:00.000Z");

function payment(over: Partial<InMemCutPayment> = {}): InMemCutPayment {
  return {
    paymentId: "cp1",
    status: "completed",
    branchId: "b1",
    customerId: "cust1",
    customerCode: "C001",
    customerName: "Cliente Uno",
    docto: "AB-000001",
    factura: "TC-000001",
    facturaDate: new Date("2026-06-01T00:00:00.000Z"),
    amount: 116,
    paymentMethodId: "pm1",
    paymentMethodCode: "EFECTIVO",
    paymentMethodName: "Efectivo",
    reference: "efectivo",
    collectedAt: new Date("2026-06-04T10:00:00.000Z"),
    saleTaxTotal: 16,
    saleSubtotal: 100,
    saleTotal: 116,
    ...over,
  };
}

function base(payments: InMemCutPayment[]) {
  return new GetCashCutReportUseCase(new InMemoryCashCutRepository(payments));
}

const req = (over = {}) => ({
  branchId: null, customerId: null, paymentMethodId: null, from: FROM, to: TO, generatedBy: GEN, ...over,
});

describe("GetCashCutReportUseCase", () => {
  it("periodo vacío → ceros y arrays vacíos", async () => {
    const dto = await base([]).execute(req());
    expect(dto.rows).toHaveLength(0);
    expect(dto.totals.totalCollected).toBe("0.0000");
    expect(dto.totals.totalIva).toBe("0.0000");
    expect(dto.byPaymentMethod).toHaveLength(0);
  });

  it("fila con días e IVA prorrateado", async () => {
    const dto = await base([payment()]).execute(req());
    expect(dto.rows).toHaveLength(1);
    expect(dto.rows[0].days).toBe(3);
    expect(dto.rows[0].ivaAmount).toBe("16.0000");
    expect(dto.rows[0].docto).toBe("AB-000001");
    expect(dto.rows[0].factura).toBe("TC-000001");
  });

  it("abonos cancelados no cuentan", async () => {
    const dto = await base([payment({ status: "cancelled" })]).execute(req());
    expect(dto.rows).toHaveLength(0);
  });

  it("filtro por cliente acota las filas", async () => {
    const dto = await base([
      payment({ paymentId: "a", customerId: "x", amount: 100 }),
      payment({ paymentId: "b", customerId: "y", amount: 200 }),
    ]).execute(req({ customerId: "x" }));
    expect(dto.rows).toHaveLength(1);
    expect(dto.totals.totalCollected).toBe("100.0000");
  });
});
