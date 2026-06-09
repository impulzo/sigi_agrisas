import { ReturnTotalsCalculator } from "@/modules/returns/domain/services/ReturnTotalsCalculator";
import { SaleTotalsCalculator } from "@/modules/pos/domain/services/SaleTotalsCalculator";
import { QuoteTotalsCalculator } from "@/modules/quotes/domain/services/QuoteTotalsCalculator";
import { totalsVectors } from "../../../../../fixtures/totals-vectors";

describe("ReturnTotalsCalculator", () => {
  it("computes a single line with no taxes", () => {
    const r = ReturnTotalsCalculator.computeTotals([{ quantity: 2, unitPrice: 50 }]);
    expect(r.subtotal).toBe(100);
    expect(r.taxTotal).toBe(0);
    expect(r.total).toBe(100);
    expect(r.lines[0].lineSubtotal).toBe(100);
  });

  it("computes IVA correctly", () => {
    const r = ReturnTotalsCalculator.computeTotals([{ quantity: 1, unitPrice: 100, ivaRate: 0.16 }]);
    expect(r.lines[0].lineIva).toBe(16);
    expect(r.lines[0].lineIeps).toBe(0);
    expect(r.lines[0].lineTax).toBe(16);
    expect(r.lines[0].lineTotal).toBe(116);
  });

  it("applies discount before tax", () => {
    const r = ReturnTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, discountPct: 10, ivaRate: 0.16 },
    ]);
    expect(r.lines[0].lineSubtotal).toBe(90);
    expect(r.lines[0].lineIva).toBe(14.4);
    expect(r.lines[0].lineTotal).toBe(104.4);
  });

  it("computes IEPS and IVA on the same subtotal", () => {
    const r = ReturnTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, ivaRate: 0.16, iepsRate: 0.08 },
    ]);
    expect(r.lines[0].lineIva).toBe(16);
    expect(r.lines[0].lineIeps).toBe(8);
    expect(r.lines[0].lineTax).toBe(24);
    expect(r.lines[0].lineTotal).toBe(124);
  });

  it("treats null rates as 0", () => {
    const r = ReturnTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, ivaRate: null, iepsRate: null },
    ]);
    expect(r.lines[0].lineIva).toBe(0);
    expect(r.lines[0].lineIeps).toBe(0);
    expect(r.total).toBe(100);
  });

  it("aggregates multi-line totals", () => {
    const r = ReturnTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, ivaRate: 0.16 },
      { quantity: 2, unitPrice: 50 },
    ]);
    expect(r.subtotal).toBe(200);
    expect(r.taxTotal).toBe(16);
    expect(r.total).toBe(216);
  });

  it("applies banker's rounding to limit float artifacts", () => {
    const r = ReturnTotalsCalculator.computeTotals([{ quantity: 3, unitPrice: 33.333, ivaRate: 0.16 }]);
    expect(r.lines[0].lineSubtotal).toBe(99.999);
    expect(typeof r.lines[0].lineIva).toBe("number");
  });

  it("throws on quantity <= 0", () => {
    expect(() =>
      ReturnTotalsCalculator.computeTotals([{ quantity: 0, unitPrice: 10 }])
    ).toThrow("quantity must be > 0");
    expect(() =>
      ReturnTotalsCalculator.computeTotals([{ quantity: -1, unitPrice: 10 }])
    ).toThrow("quantity must be > 0");
  });

  it("throws on unitPrice < 0", () => {
    expect(() =>
      ReturnTotalsCalculator.computeTotals([{ quantity: 1, unitPrice: -1 }])
    ).toThrow("unitPrice must be >= 0");
  });

  it("throws on discountPct out of range", () => {
    expect(() =>
      ReturnTotalsCalculator.computeTotals([{ quantity: 1, unitPrice: 10, discountPct: 101 }])
    ).toThrow("discountPct must be between 0 and 100");
  });

  describe("equivalence with SaleTotalsCalculator and QuoteTotalsCalculator", () => {
    totalsVectors.forEach((vector, i) => {
      it(`vector ${i + 1}`, () => {
        const returnResult = ReturnTotalsCalculator.computeTotals(vector as Parameters<typeof ReturnTotalsCalculator.computeTotals>[0]);
        const saleResult = SaleTotalsCalculator.computeTotals(vector as Parameters<typeof SaleTotalsCalculator.computeTotals>[0]);
        const quoteResult = QuoteTotalsCalculator.computeTotals(vector as Parameters<typeof QuoteTotalsCalculator.computeTotals>[0]);

        expect(returnResult.subtotal).toBe(saleResult.subtotal);
        expect(returnResult.taxTotal).toBe(saleResult.taxTotal);
        expect(returnResult.total).toBe(saleResult.total);

        expect(returnResult.subtotal).toBe(quoteResult.subtotal);
        expect(returnResult.taxTotal).toBe(quoteResult.taxTotal);
        expect(returnResult.total).toBe(quoteResult.total);

        returnResult.lines.forEach((line, j) => {
          expect(line.lineSubtotal).toBe(saleResult.lines[j].lineSubtotal);
          expect(line.lineTax).toBe(saleResult.lines[j].lineTax);
          expect(line.lineTotal).toBe(saleResult.lines[j].lineTotal);
        });
      });
    });
  });
});
