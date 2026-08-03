import { PurchaseTotalsCalculator } from "@/modules/purchases/domain/services/PurchaseTotalsCalculator";

describe("PurchaseTotalsCalculator", () => {
  it("computes a single line with no taxes", () => {
    const r = PurchaseTotalsCalculator.computeTotals([{ quantity: 2, unitCost: 50 }]);
    expect(r.subtotal).toBe(100);
    expect(r.taxTotal).toBe(0);
    expect(r.total).toBe(100);
    expect(r.lines[0].lineSubtotal).toBe(100);
  });

  it("computes IVA correctly", () => {
    const r = PurchaseTotalsCalculator.computeTotals([{ quantity: 1, unitCost: 100, ivaRate: 0.16 }]);
    expect(r.lines[0].lineIva).toBe(16);
    expect(r.lines[0].lineIeps).toBe(0);
    expect(r.lines[0].lineTax).toBe(16);
    expect(r.lines[0].lineTotal).toBe(116);
  });

  it("applies discount before tax", () => {
    const r = PurchaseTotalsCalculator.computeTotals([
      { quantity: 1, unitCost: 100, discountPct: 10, ivaRate: 0.16 },
    ]);
    expect(r.lines[0].lineSubtotal).toBe(90);
    expect(r.lines[0].lineIva).toBe(14.4);
    expect(r.lines[0].lineTotal).toBe(104.4);
  });

  it("computes IEPS and IVA on the same subtotal", () => {
    const r = PurchaseTotalsCalculator.computeTotals([
      { quantity: 1, unitCost: 100, ivaRate: 0.16, iepsRate: 0.08 },
    ]);
    expect(r.lines[0].lineIva).toBe(16);
    expect(r.lines[0].lineIeps).toBe(8);
    expect(r.lines[0].lineTax).toBe(24);
    expect(r.lines[0].lineTotal).toBe(124);
  });

  it("treats isTaxable=false as zero tax regardless of rates", () => {
    const r = PurchaseTotalsCalculator.computeTotals([
      { quantity: 1, unitCost: 100, ivaRate: 0.16, iepsRate: 0.08, isTaxable: false },
    ]);
    expect(r.lines[0].lineTax).toBe(0);
    expect(r.total).toBe(100);
  });

  it("aggregates multi-line totals", () => {
    const r = PurchaseTotalsCalculator.computeTotals([
      { quantity: 1, unitCost: 100, ivaRate: 0.16 },
      { quantity: 2, unitCost: 50 },
    ]);
    expect(r.subtotal).toBe(200);
    expect(r.taxTotal).toBe(16);
    expect(r.total).toBe(216);
  });

  it("throws on quantity <= 0", () => {
    expect(() => PurchaseTotalsCalculator.computeTotals([{ quantity: 0, unitCost: 10 }])).toThrow(
      "quantity must be > 0"
    );
  });

  it("throws on unitCost < 0", () => {
    expect(() => PurchaseTotalsCalculator.computeTotals([{ quantity: 1, unitCost: -1 }])).toThrow(
      "unitCost must be >= 0"
    );
  });

  it("throws on discountPct out of range", () => {
    expect(() =>
      PurchaseTotalsCalculator.computeTotals([{ quantity: 1, unitCost: 10, discountPct: 101 }])
    ).toThrow("discountPct must be between 0 and 100");
  });
});
