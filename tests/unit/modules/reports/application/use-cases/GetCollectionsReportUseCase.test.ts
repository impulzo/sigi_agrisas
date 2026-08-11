import { GetCollectionsReportUseCase } from "@/modules/reports/application/use-cases/GetCollectionsReportUseCase";
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
    saleId: "sale1",
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
  return new GetCollectionsReportUseCase(new InMemoryCashCutRepository(payments));
}

const req = (over = {}) => ({ branchId: null, customerId: null, from: FROM, to: TO, generatedBy: GEN, ...over });

describe("GetCollectionsReportUseCase", () => {
  it("periodo vacío → ceros y arrays vacíos", async () => {
    const dto = await base([]).execute(req());
    expect(dto.rows).toHaveLength(0);
    expect(dto.byCustomer).toHaveLength(0);
    expect(dto.byTicket).toHaveLength(0);
    expect(dto.totals.totalCollected).toBe("0.0000");
  });

  it("agrupa por cliente y por ticket abonado", async () => {
    const dto = await base([
      payment({ paymentId: "p1", saleId: "sale-1", customerId: "cust1", amount: 50 }),
      payment({ paymentId: "p2", saleId: "sale-1", customerId: "cust1", amount: 66 }),
      payment({ paymentId: "p3", saleId: "sale-2", customerId: "cust2", customerName: "Cliente Dos", amount: 20 }),
    ]).execute(req());

    expect(dto.rows).toHaveLength(3);
    expect(dto.byCustomer.find((c) => c.customerId === "cust1")?.total).toBe("116.0000");
    expect(dto.byTicket.find((t) => t.saleId === "sale-1")?.count).toBe(2);
    expect(dto.byTicket.find((t) => t.saleId === "sale-1")?.total).toBe("116.0000");
  });

  it("abonos cancelados no cuentan", async () => {
    const dto = await base([payment({ status: "cancelled" })]).execute(req());
    expect(dto.rows).toHaveLength(0);
  });

  it("filtro por cliente acota las filas", async () => {
    const dto = await base([
      payment({ paymentId: "a", customerId: "x", saleId: "s1", amount: 100 }),
      payment({ paymentId: "b", customerId: "y", saleId: "s2", amount: 200 }),
    ]).execute(req({ customerId: "x" }));
    expect(dto.rows).toHaveLength(1);
    expect(dto.totals.totalCollected).toBe("100.0000");
  });
});
