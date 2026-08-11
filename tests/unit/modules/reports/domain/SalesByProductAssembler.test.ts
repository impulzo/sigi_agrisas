import { SalesByProductAssembler } from "@/modules/reports/domain/services/SalesByProductAssembler";
import {
  SalesByProductAggregates,
  SalesByProductBreakdownRow,
  SalesByProductRow,
} from "@/modules/reports/domain/value-objects/SalesByProductFilters";

function row(over: Partial<SalesByProductBreakdownRow> & { key: string }): SalesByProductBreakdownRow {
  return { label: over.key, ticketCount: 1, subtotal: 0, taxTotal: 0, total: 0, ...over };
}

function productRow(over: Partial<SalesByProductRow> & { key: string }): SalesByProductRow {
  return { label: over.key, ticketCount: 1, quantitySold: 0, currentStock: 0, subtotal: 0, taxTotal: 0, total: 0, ...over };
}

function agg(over: Partial<SalesByProductAggregates> = {}): SalesByProductAggregates {
  return {
    totals: { ticketCount: 3, subtotal: 900, taxTotal: 100, total: 1000 },
    byCustomer: [],
    byDepartment: [],
    byProduct: [],
    ...over,
  };
}

describe("SalesByProductAssembler", () => {
  it("ordena byCustomer, byDepartment y byProduct descendente por total", () => {
    const out = SalesByProductAssembler.assemble(
      agg({
        byCustomer: [row({ key: "c1", total: 10 }), row({ key: "c2", total: 90 })],
        byDepartment: [row({ key: "d1", total: 10 }), row({ key: "d2", total: 90 })],
        byProduct: [
          productRow({ key: "p1", total: 10, quantitySold: 3, currentStock: 5 }),
          productRow({ key: "p2", total: 90, quantitySold: 7, currentStock: 2 }),
        ],
      })
    );
    expect(out.byCustomer.map((r) => r.key)).toEqual(["c2", "c1"]);
    expect(out.byDepartment.map((r) => r.key)).toEqual(["d2", "d1"]);
    expect(out.byProduct.map((r) => r.key)).toEqual(["p2", "p1"]);
  });

  it("preserva quantitySold y currentStock del cruce inventario × ventas", () => {
    const out = SalesByProductAssembler.assemble(
      agg({ byProduct: [productRow({ key: "p1", total: 50, quantitySold: 12, currentStock: 40 })] })
    );
    expect(out.byProduct[0].quantitySold).toBe(12);
    expect(out.byProduct[0].currentStock).toBe(40);
  });

  it("totals se mantienen constantes sin importar el modo de agrupación", () => {
    const out = SalesByProductAssembler.assemble(agg());
    expect(out.totals).toEqual({ ticketCount: 3, subtotal: 900, taxTotal: 100, total: 1000 });
  });

  it("sin drift en decimales (banker's rounding a 4 decimales)", () => {
    const out = SalesByProductAssembler.assemble(
      agg({
        totals: { ticketCount: 1, subtotal: 0.1, taxTotal: 0.2, total: 0.3 },
        byProduct: [productRow({ key: "p1", total: 0.30000001, quantitySold: 1.00000001, currentStock: 1 })],
      })
    );
    expect(out.totals.total).toBe(0.3);
    expect(out.byProduct[0].total).toBe(0.3);
  });

  it("sin ventas en el periodo, todos los desgloses quedan vacíos", () => {
    const out = SalesByProductAssembler.assemble(
      agg({ totals: { ticketCount: 0, subtotal: 0, taxTotal: 0, total: 0 } })
    );
    expect(out.byCustomer).toEqual([]);
    expect(out.byDepartment).toEqual([]);
    expect(out.byProduct).toEqual([]);
  });
});
