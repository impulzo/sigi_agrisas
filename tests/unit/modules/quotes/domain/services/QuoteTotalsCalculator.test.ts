import { QuoteTotalsCalculator } from "@/modules/quotes/domain/services/QuoteTotalsCalculator";
import { SaleTotalsCalculator } from "@/modules/pos/domain/services/SaleTotalsCalculator";
import { totalsVectors } from "../../../../../fixtures/totals-vectors";

describe("QuoteTotalsCalculator", () => {
  it("calcula una línea simple con IVA 16%", () => {
    const r = QuoteTotalsCalculator.computeTotals([
      { quantity: 2, unitPrice: 100, ivaRate: 0.16 },
    ]);
    expect(r.lines[0]).toEqual({
      lineSubtotal: 200,
      lineIva: 32,
      lineIeps: 0,
      lineTax: 32,
      lineTotal: 232,
    });
    expect(r.subtotal).toBe(200);
    expect(r.taxTotal).toBe(32);
    expect(r.total).toBe(232);
  });

  it("aplica descuento por línea", () => {
    const r = QuoteTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, discountPct: 10 },
    ]);
    expect(r.lines[0].lineSubtotal).toBe(90);
    expect(r.lines[0].lineTotal).toBe(90);
  });

  it("combina IVA y IEPS", () => {
    const r = QuoteTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, ivaRate: 0.16, iepsRate: 0.08 },
    ]);
    expect(r.lines[0].lineIva).toBe(16);
    expect(r.lines[0].lineIeps).toBe(8);
    expect(r.lines[0].lineTax).toBe(24);
    expect(r.lines[0].lineTotal).toBe(124);
  });

  it("trata null e indefinido como 0", () => {
    const r = QuoteTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, ivaRate: null, iepsRate: null },
    ]);
    expect(r.lines[0].lineTax).toBe(0);
    expect(r.lines[0].lineTotal).toBe(100);
  });

  it("agrega múltiples líneas correctamente", () => {
    const r = QuoteTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, ivaRate: 0.16 },
      { quantity: 2, unitPrice: 50 },
    ]);
    expect(r.subtotal).toBe(200);
    expect(r.taxTotal).toBe(16);
    expect(r.total).toBe(216);
  });

  it("rechaza quantity <= 0", () => {
    expect(() =>
      QuoteTotalsCalculator.computeTotals([{ quantity: 0, unitPrice: 100 }])
    ).toThrow();
  });

  it("rechaza unitPrice < 0", () => {
    expect(() =>
      QuoteTotalsCalculator.computeTotals([{ quantity: 1, unitPrice: -1 }])
    ).toThrow();
  });

  it("rechaza discountPct fuera de [0, 100]", () => {
    expect(() =>
      QuoteTotalsCalculator.computeTotals([
        { quantity: 1, unitPrice: 100, discountPct: 150 },
      ])
    ).toThrow();
  });

  it("rechaza ivaRate fuera de [0, 1]", () => {
    expect(() =>
      QuoteTotalsCalculator.computeTotals([
        { quantity: 1, unitPrice: 100, ivaRate: 1.5 },
      ])
    ).toThrow();
  });

  it("rechaza iepsRate fuera de [0, 1]", () => {
    expect(() =>
      QuoteTotalsCalculator.computeTotals([
        { quantity: 1, unitPrice: 100, iepsRate: 2 },
      ])
    ).toThrow();
  });

  describe("equivalencia con SaleTotalsCalculator", () => {
    it.each(totalsVectors.map((f, i) => [`fixture #${i + 1}`, f]))(
      "%s: QuoteTotalsCalculator === SaleTotalsCalculator",
      (_label, lines) => {
        const quoteResult = QuoteTotalsCalculator.computeTotals(lines as never);
        const saleResult = SaleTotalsCalculator.computeTotals(lines as never);
        expect(quoteResult).toEqual(saleResult);
      }
    );
  });
});
