import {
  DosificationPriceCalculator,
  DOSIFICATION_SURCHARGE_PCT,
} from "@/modules/products/domain/services/DosificationPriceCalculator";

describe("DosificationPriceCalculator", () => {
  it("computes a simple case (100 / 10 * 1.07 = 10.7)", () => {
    expect(DosificationPriceCalculator.computeUnitPrice(100, 10)).toBeCloseTo(10.7, 10);
  });

  it("computes with decimals (99.99 / 7 * 1.07)", () => {
    expect(DosificationPriceCalculator.computeUnitPrice(99.99, 7)).toBeCloseTo((99.99 / 7) * 1.07, 10);
  });

  it("returns 0 for a zero base price", () => {
    expect(DosificationPriceCalculator.computeUnitPrice(0, 10)).toBe(0);
  });

  it("throws when numParts < 1", () => {
    expect(() => DosificationPriceCalculator.computeUnitPrice(100, 0)).toThrow();
    expect(() => DosificationPriceCalculator.computeUnitPrice(100, -1)).toThrow();
  });

  it("exposes a fixed 7% surcharge constant", () => {
    expect(DOSIFICATION_SURCHARGE_PCT).toBe(7.0);
  });
});
