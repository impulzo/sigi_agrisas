import { DosificationPriceCalculator } from "@/modules/products/domain/services/DosificationPriceCalculator";

describe("DosificationPriceCalculator", () => {
  it("computes a simple case with the default 5% surcharge (100 / 10 * 1.05 = 10.5)", () => {
    expect(DosificationPriceCalculator.computeUnitPrice(100, 10, 5)).toBeCloseTo(10.5, 10);
  });

  it("computes a simple case with a custom surcharge (100 / 10 * 1.07 = 10.7)", () => {
    expect(DosificationPriceCalculator.computeUnitPrice(100, 10, 7)).toBeCloseTo(10.7, 10);
  });

  it("computes with decimals (99.99 / 7 * 1.05)", () => {
    expect(DosificationPriceCalculator.computeUnitPrice(99.99, 7, 5)).toBeCloseTo((99.99 / 7) * 1.05, 10);
  });

  it("returns 0 for a zero base price", () => {
    expect(DosificationPriceCalculator.computeUnitPrice(0, 10, 5)).toBe(0);
  });

  it("throws when numParts < 1", () => {
    expect(() => DosificationPriceCalculator.computeUnitPrice(100, 0, 5)).toThrow();
    expect(() => DosificationPriceCalculator.computeUnitPrice(100, -1, 5)).toThrow();
  });
});
