import { isFractionalQuantity } from "@/modules/products/domain/services/isFractionalQuantity";

describe("isFractionalQuantity", () => {
  it("returns false for whole numbers", () => {
    expect(isFractionalQuantity(1)).toBe(false);
    expect(isFractionalQuantity(2)).toBe(false);
    expect(isFractionalQuantity(100)).toBe(false);
  });

  it("returns true for obvious fractional quantities", () => {
    expect(isFractionalQuantity(0.5)).toBe(true);
    expect(isFractionalQuantity(2.25)).toBe(true);
  });

  it("is not fooled by floating-point noise around a whole number", () => {
    expect(isFractionalQuantity(0.1 + 0.2 - 0.3)).toBe(false); // ~3.3e-17, not a real fraction
    expect(isFractionalQuantity(2.9999999999996)).toBe(false);
    expect(isFractionalQuantity(1.00000000001)).toBe(false);
  });

  it("detects a real fraction close to a whole number", () => {
    expect(isFractionalQuantity(2.9999)).toBe(true);
    expect(isFractionalQuantity(1.0001)).toBe(true);
  });

  it("does not crash on zero or negative input", () => {
    expect(isFractionalQuantity(0)).toBe(false);
    expect(isFractionalQuantity(-2)).toBe(false);
    expect(isFractionalQuantity(-0.5)).toBe(true);
  });
});
