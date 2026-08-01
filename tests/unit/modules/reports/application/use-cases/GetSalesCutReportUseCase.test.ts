import { GetSalesCutReportUseCase } from "@/modules/reports/application/use-cases/GetSalesCutReportUseCase";
import {
  InMemorySalesCutRepository,
  InMemCutSale,
  InMemCutPayment,
  InMemCutReturn,
} from "@/modules/reports/infrastructure/repositories/InMemorySalesCutRepository";

const GEN = { userId: "u1", email: "op@test.com" };
const FROM = new Date("2026-07-01T00:00:00.000Z");
const TO = new Date("2026-07-31T00:00:00.000Z");

function sale(over: Partial<InMemCutSale> = {}): InMemCutSale {
  return {
    id: "s1", status: "completed", total: 116, subtotal: 100, taxTotal: 16, iva: 16, ieps: 0,
    branchId: "b1", branchName: "Matriz", cashierId: "c1", cashierName: "Ana",
    paymentMethodId: "pm1", paymentMethodName: "Efectivo",
    createdAt: new Date("2026-07-05T10:00:00.000Z"), ...over,
  };
}

function base(sales: InMemCutSale[], payments: InMemCutPayment[] = [], returns: InMemCutReturn[] = []) {
  return new GetSalesCutReportUseCase(new InMemorySalesCutRepository(sales, payments, returns));
}

const req = (over = {}) => ({
  branchId: null, cashierId: null, paymentMethodId: null, from: FROM, to: TO, generatedBy: GEN, ...over,
});

describe("GetSalesCutReportUseCase", () => {
  it("periodo vacío → ceros y arrays vacíos", async () => {
    const dto = await base([]).execute(req());
    expect(dto.totals.grossSales).toBe("0.0000");
    expect(dto.totals.ticketCount).toBe(0);
    expect(dto.cash.netCash).toBe("0.0000");
    expect(dto.byPaymentMethod).toHaveLength(0);
    expect(dto.byDay).toHaveLength(0);
  });

  it("neto de caja = ventas + abonos − devoluciones", async () => {
    const dto = await base(
      [sale({ total: 500 })],
      [{ amount: 200, status: "completed", branchId: "b1", createdAt: new Date("2026-07-06T10:00:00Z") }],
      [{ refundTotal: 100, status: "completed", branchId: "b1", returnedAt: new Date("2026-07-07T10:00:00Z") }]
    ).execute(req());
    expect(dto.cash.grossSales).toBe("500.0000");
    expect(dto.cash.paymentsReceived).toBe("200.0000");
    expect(dto.cash.returnsRefunded).toBe("100.0000");
    expect(dto.cash.netCash).toBe("600.0000");
  });

  it("canceladas aparte; abonos/devoluciones cancelados no cuentan", async () => {
    const dto = await base(
      [sale({ total: 300 }), sale({ id: "s2", status: "cancelled", total: 999 })],
      [{ amount: 50, status: "cancelled", branchId: "b1", createdAt: new Date("2026-07-06T10:00:00Z") }],
      [{ refundTotal: 30, status: "cancelled", branchId: "b1", returnedAt: new Date("2026-07-07T10:00:00Z") }]
    ).execute(req());
    expect(dto.totals.grossSales).toBe("300.0000");
    expect(dto.cancelled).toEqual({ count: 1, total: "999.0000" });
    expect(dto.cash.paymentsReceived).toBe("0.0000");
    expect(dto.cash.returnsRefunded).toBe("0.0000");
    expect(dto.cash.netCash).toBe("300.0000");
  });

  it("filtro por cajero acota los agregados", async () => {
    const dto = await base([
      sale({ id: "a", cashierId: "c1", total: 100 }),
      sale({ id: "b", cashierId: "c2", total: 200 }),
    ]).execute(req({ cashierId: "c1" }));
    expect(dto.totals.grossSales).toBe("100.0000");
    expect(dto.byCashier).toHaveLength(1);
  });
});
