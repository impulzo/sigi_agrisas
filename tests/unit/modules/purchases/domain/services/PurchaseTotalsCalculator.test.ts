import { PurchaseTotalsCalculator } from "@/modules/purchases/domain/services/PurchaseTotalsCalculator";

describe("PurchaseTotalsCalculator", () => {
  it("computes a single line with no taxes", () => {
    const r = PurchaseTotalsCalculator.computeTotals([{ quantity: 2, unitCost: 50 }]);
    expect(r.subtotal).toBe(100);
    expect(r.taxTotal).toBe(0);
    expect(r.total).toBe(100);
    expect(r.lines[0].lineSubtotal).toBe(100);
  });

  it("extracts IVA from the tax-inclusive final cost", () => {
    const r = PurchaseTotalsCalculator.computeTotals([{ quantity: 1, unitCost: 100, ivaRate: 0.16 }]);
    expect(r.lines[0].lineIva).toBe(13.7931);
    expect(r.lines[0].lineIeps).toBe(0);
    expect(r.lines[0].lineTax).toBe(13.7931);
    expect(r.lines[0].lineTotal).toBe(100);
  });

  it("applies discount before extracting tax", () => {
    const r = PurchaseTotalsCalculator.computeTotals([
      { quantity: 1, unitCost: 100, discountPct: 10, ivaRate: 0.16 },
    ]);
    expect(r.lines[0].lineSubtotal).toBe(77.5862);
    expect(r.lines[0].lineIva).toBe(12.4138);
    expect(r.lines[0].lineTotal).toBe(90);
  });

  it("extracts IEPS and IVA simultaneously from the same base (not cascaded)", () => {
    const r = PurchaseTotalsCalculator.computeTotals([
      { quantity: 1, unitCost: 100, ivaRate: 0.16, iepsRate: 0.08 },
    ]);
    expect(r.lines[0].lineIva).toBe(12.9032);
    expect(r.lines[0].lineIeps).toBe(6.4516);
    expect(r.lines[0].lineTax).toBe(19.3548);
    expect(r.lines[0].lineTotal).toBe(100);
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
    expect(r.subtotal).toBe(186.2069);
    expect(r.taxTotal).toBe(13.7931);
    expect(r.total).toBe(200);
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
