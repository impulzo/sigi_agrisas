import { ReturnableQuantityCalculator } from "@/modules/returns/domain/services/ReturnableQuantityCalculator";

describe("ReturnableQuantityCalculator.computeRemaining", () => {
  it("returns soldQuantity when no prior returns", () => {
    expect(ReturnableQuantityCalculator.computeRemaining(10, [])).toBe(10);
  });

  it("subtracts a single completed return", () => {
    expect(
      ReturnableQuantityCalculator.computeRemaining(10, [
        { quantity: 3, returnStatus: "completed" },
      ])
    ).toBe(7);
  });

  it("subtracts multiple completed returns", () => {
    expect(
      ReturnableQuantityCalculator.computeRemaining(10, [
        { quantity: 3, returnStatus: "completed" },
        { quantity: 2, returnStatus: "completed" },
      ])
    ).toBe(5);
  });

  it("does NOT subtract cancelled returns", () => {
    expect(
      ReturnableQuantityCalculator.computeRemaining(10, [
        { quantity: 4, returnStatus: "cancelled" },
      ])
    ).toBe(10);
  });

  it("ignores cancelled returns alongside completed ones", () => {
    expect(
      ReturnableQuantityCalculator.computeRemaining(10, [
        { quantity: 3, returnStatus: "completed" },
        { quantity: 5, returnStatus: "cancelled" },
      ])
    ).toBe(7);
  });

  it("returns 0 when fully returned", () => {
    expect(
      ReturnableQuantityCalculator.computeRemaining(5, [
        { quantity: 5, returnStatus: "completed" },
      ])
    ).toBe(0);
  });

  it("handles decimal quantities", () => {
    const result = ReturnableQuantityCalculator.computeRemaining(10.5, [
      { quantity: 3.25, returnStatus: "completed" },
    ]);
    expect(result).toBeCloseTo(7.25, 5);
  });

  it("throws when soldQuantity <= 0", () => {
    expect(() => ReturnableQuantityCalculator.computeRemaining(0, [])).toThrow(
      "soldQuantity must be > 0"
    );
    expect(() => ReturnableQuantityCalculator.computeRemaining(-1, [])).toThrow(
      "soldQuantity must be > 0"
    );
  });

  it("throws when a completed prior item has quantity <= 0", () => {
    expect(() =>
      ReturnableQuantityCalculator.computeRemaining(10, [
        { quantity: 0, returnStatus: "completed" },
      ])
    ).toThrow("prior return item quantity must be > 0");
    expect(() =>
      ReturnableQuantityCalculator.computeRemaining(10, [
        { quantity: -1, returnStatus: "completed" },
      ])
    ).toThrow("prior return item quantity must be > 0");
  });

  it("does NOT throw when a cancelled prior item has quantity <= 0", () => {
    expect(
      ReturnableQuantityCalculator.computeRemaining(10, [
        { quantity: 0, returnStatus: "cancelled" },
      ])
    ).toBe(10);
    expect(
      ReturnableQuantityCalculator.computeRemaining(10, [
        { quantity: -5, returnStatus: "cancelled" },
        { quantity: 3, returnStatus: "completed" },
      ])
    ).toBe(7);
  });
});
