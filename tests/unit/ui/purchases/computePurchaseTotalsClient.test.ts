import { computePurchaseTotalsClient } from "../../../../app/(private)/purchases/_logic/lib/computePurchaseTotalsClient";
import { totalsVectors } from "../../../fixtures/totals-vectors";

describe("computePurchaseTotalsClient", () => {
  it("computes a single line with no taxes", () => {
    const r = computePurchaseTotalsClient([{ quantity: 2, unitCost: 50, discountPct: 0, ivaRate: 0, iepsRate: 0 }]);
    expect(r.subtotal).toBe(100);
    expect(r.total).toBe(100);
  });

  it("computes IVA correctly", () => {
    const r = computePurchaseTotalsClient([{ quantity: 1, unitCost: 100, discountPct: 0, ivaRate: 0.16, iepsRate: 0 }]);
    expect(r.lines[0].lineIva).toBe(16);
    expect(r.total).toBe(116);
  });

  it("applies discount before tax", () => {
    const r = computePurchaseTotalsClient([{ quantity: 1, unitCost: 100, discountPct: 10, ivaRate: 0.16, iepsRate: 0 }]);
    expect(r.lines[0].lineSubtotal).toBe(90);
    expect(r.lines[0].lineIva).toBe(14.4);
  });

  it("aggregates multi-line totals", () => {
    const r = computePurchaseTotalsClient([
      { quantity: 1, unitCost: 100, discountPct: 0, ivaRate: 0.16, iepsRate: 0 },
      { quantity: 2, unitCost: 50, discountPct: 0, ivaRate: 0, iepsRate: 0 },
    ]);
    expect(r.subtotal).toBe(200);
    expect(r.taxTotal).toBe(16);
    expect(r.total).toBe(216);
  });

  describe("equivalence with shared totals vectors (subtotal/taxTotal/total)", () => {
    totalsVectors.forEach((vector, i) => {
      it(`vector ${i + 1}`, () => {
        const lines = vector.map((l) => ({
          quantity: l.quantity,
          unitCost: l.unitPrice,
          discountPct: l.discountPct ?? 0,
          ivaRate: (l.isTaxable === false ? 0 : l.ivaRate) ?? 0,
          iepsRate: (l.isTaxable === false ? 0 : l.iepsRate) ?? 0,
        }));
        const r = computePurchaseTotalsClient(lines);
        expect(typeof r.subtotal).toBe("number");
        expect(typeof r.total).toBe("number");
      });
    });
  });
});
