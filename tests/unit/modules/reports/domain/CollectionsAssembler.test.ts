import { CollectionsAssembler } from "@/modules/reports/domain/services/CollectionsAssembler";
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

describe("CollectionsAssembler", () => {
  it("agrupa por cliente sumando el total cobrado", () => {
    const out = CollectionsAssembler.assemble([
      row({ paymentId: "p1", customerId: "cust-1", customerName: "Cliente Uno", amount: 100 }),
      row({ paymentId: "p2", customerId: "cust-1", customerName: "Cliente Uno", amount: 50 }),
      row({ paymentId: "p3", customerId: "cust-2", customerName: "Cliente Dos", amount: 30 }),
    ]);

    const byCustomer = out.byCustomer.sort((a, b) => a.customerId.localeCompare(b.customerId));
    expect(byCustomer).toEqual([
      { customerId: "cust-1", customerCode: "C001", customerName: "Cliente Uno", count: 2, total: 150 },
      { customerId: "cust-2", customerCode: "C001", customerName: "Cliente Dos", count: 1, total: 30 },
    ]);
  });

  it("agrupa por ticket abonado (saleId) sumando los abonos aplicados", () => {
    const out = CollectionsAssembler.assemble([
      row({ paymentId: "p1", saleId: "sale-1", factura: "TC-000001", amount: 50 }),
      row({ paymentId: "p2", saleId: "sale-1", factura: "TC-000001", amount: 66 }),
      row({ paymentId: "p3", saleId: "sale-2", factura: "TC-000002", amount: 20 }),
    ]);

    const byTicket = out.byTicket.sort((a, b) => a.saleId.localeCompare(b.saleId));
    expect(byTicket).toEqual([
      { saleId: "sale-1", factura: "TC-000001", customerName: "Cliente Uno", count: 2, total: 116 },
      { saleId: "sale-2", factura: "TC-000002", customerName: "Cliente Uno", count: 1, total: 20 },
    ]);
  });

  it("totals.totalCollected suma todos los abonos", () => {
    const out = CollectionsAssembler.assemble([row({ amount: 100 }), row({ paymentId: "p2", amount: 50 })]);
    expect(out.totals.totalCollected).toBe(150);
  });

  it("byCustomer y byTicket se ordenan descendente por total", () => {
    const out = CollectionsAssembler.assemble([
      row({ paymentId: "p1", saleId: "s1", customerId: "c1", amount: 10 }),
      row({ paymentId: "p2", saleId: "s2", customerId: "c2", amount: 90 }),
    ]);
    expect(out.byCustomer.map((r) => r.customerId)).toEqual(["c2", "c1"]);
    expect(out.byTicket.map((r) => r.saleId)).toEqual(["s2", "s1"]);
  });

  it("sin abonos en el periodo, arrays vacíos y total en cero", () => {
    const out = CollectionsAssembler.assemble([]);
    expect(out.rows).toEqual([]);
    expect(out.byCustomer).toEqual([]);
    expect(out.byTicket).toEqual([]);
    expect(out.totals.totalCollected).toBe(0);
  });
});
