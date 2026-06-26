import { SaleTotalsCalculator } from "../../../../src/modules/pos/domain/services/SaleTotalsCalculator";
import { InvoiceTotalsCalculator } from "../../../../src/modules/billing/domain/services/InvoiceTotalsCalculator";
import { totalsVectors } from "../../../fixtures/totals-vectors";

describe("InvoiceTotalsCalculator equivalence with SaleTotalsCalculator", () => {
  const taxableVectors = totalsVectors.filter((lines) =>
    lines.every((l) => l.isTaxable !== false)
  );

  test.each(taxableVectors.map((v, i) => [i, v]))(
    "vector %i: subtotal/taxTotal/total match SaleTotalsCalculator",
    (_idx, lines) => {
      const saleResult = SaleTotalsCalculator.computeTotals(lines);
      const invoiceResult = InvoiceTotalsCalculator.computeTotals(
        lines.map((l) => ({
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          ivaRate: l.ivaRate,
          iepsRate: l.iepsRate,
        }))
      );

      expect(invoiceResult.subtotal).toBe(saleResult.subtotal);
      expect(invoiceResult.taxTotal).toBe(saleResult.taxTotal);
      expect(invoiceResult.total).toBe(saleResult.total);

      for (let i = 0; i < lines.length; i++) {
        expect(invoiceResult.lines[i].lineSubtotal).toBe(saleResult.lines[i].lineSubtotal);
        expect(invoiceResult.lines[i].lineIva).toBe(saleResult.lines[i].lineIva);
        expect(invoiceResult.lines[i].lineIeps).toBe(saleResult.lines[i].lineIeps);
        expect(invoiceResult.lines[i].lineTotal).toBe(saleResult.lines[i].lineTotal);
      }
    }
  );

  it("taxObject '02' when iva > 0", () => {
    const result = InvoiceTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, ivaRate: 0.16 },
    ]);
    expect(result.lines[0].taxObject).toBe("02");
  });

  it("taxObject '01' when no taxes", () => {
    const result = InvoiceTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100 },
    ]);
    expect(result.lines[0].taxObject).toBe("01");
  });

  it("taxObject '02' when ieps > 0 and iva = 0", () => {
    const result = InvoiceTotalsCalculator.computeTotals([
      { quantity: 1, unitPrice: 100, ivaRate: 0, iepsRate: 0.08 },
    ]);
    expect(result.lines[0].taxObject).toBe("02");
  });

  it("throws on quantity <= 0", () => {
    expect(() =>
      InvoiceTotalsCalculator.computeTotals([{ quantity: 0, unitPrice: 100 }])
    ).toThrow("quantity must be > 0");
  });

  it("throws on unitPrice < 0", () => {
    expect(() =>
      InvoiceTotalsCalculator.computeTotals([{ quantity: 1, unitPrice: -1 }])
    ).toThrow("unitPrice must be >= 0");
  });
});
