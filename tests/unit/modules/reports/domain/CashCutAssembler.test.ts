import { CashCutAssembler } from "@/modules/reports/domain/services/CashCutAssembler";
import { CashCutRawRow } from "@/modules/reports/domain/value-objects/CashCutFilters";

function row(over: Partial<CashCutRawRow> = {}): CashCutRawRow {
  return {
    paymentId: "p1",
    saleId: "sale-1",
    customerId: "cust-1",
    customerCode: "C001",
    docto: "AB-000001",
    factura: "TC-000001",
    customerName: "Cliente Uno",
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

describe("CashCutAssembler", () => {
  it("calcula días transcurridos entre Fec-Fact y F.Cobro", () => {
    const out = CashCutAssembler.assemble([row()]);
    expect(out.rows[0].days).toBe(3);
  });

  it("prorratea IVA/Tasa% desde la venta ligada (venta gravada)", () => {
    const out = CashCutAssembler.assemble([row({ amount: 58, saleTotal: 116, saleTaxTotal: 16, saleSubtotal: 100 })]);
    // ivaAmount = 58 * (16/116) = 8; taxRatePct = 16/100 = 0.16
    expect(out.rows[0].ivaAmount).toBe(8);
    expect(out.rows[0].taxRatePct).toBe(0.16);
  });

  it("venta con tasa 0% da IVA/Tasa% = 0", () => {
    const out = CashCutAssembler.assemble([row({ saleTaxTotal: 0, saleSubtotal: 100, saleTotal: 100, amount: 100 })]);
    expect(out.rows[0].ivaAmount).toBe(0);
    expect(out.rows[0].taxRatePct).toBe(0);
  });

  it("totals suman amount e ivaAmount de todas las filas", () => {
    const out = CashCutAssembler.assemble([
      row({ paymentId: "p1", amount: 116, saleTotal: 116, saleTaxTotal: 16, saleSubtotal: 100 }),
      row({ paymentId: "p2", amount: 58, saleTotal: 116, saleTaxTotal: 16, saleSubtotal: 100 }),
    ]);
    expect(out.totals.totalCollected).toBe(174);
    expect(out.totals.totalIva).toBe(24); // 16 + 8
  });

  it("desglose dinámico por forma de pago, sin categorías fijas", () => {
    const out = CashCutAssembler.assemble([
      row({ paymentId: "p1", paymentMethodId: "pm1", paymentMethodName: "Efectivo", amount: 100 }),
      row({ paymentId: "p2", paymentMethodId: "pm2", paymentMethodName: "Transferencia", amount: 50 }),
      row({ paymentId: "p3", paymentMethodId: "pm1", paymentMethodName: "Efectivo", amount: 20 }),
    ]);
    expect(out.byPaymentMethod).toHaveLength(2);
    const efectivo = out.byPaymentMethod.find((r) => r.paymentMethodId === "pm1");
    expect(efectivo?.count).toBe(2);
    expect(efectivo?.total).toBe(120);
    // ordenado desc por total
    expect(out.byPaymentMethod[0].paymentMethodId).toBe("pm1");
  });

  it("sin filas → totales en cero y arrays vacíos", () => {
    const out = CashCutAssembler.assemble([]);
    expect(out.rows).toHaveLength(0);
    expect(out.totals).toEqual({ totalCollected: 0, totalIva: 0 });
    expect(out.byPaymentMethod).toHaveLength(0);
  });
});
