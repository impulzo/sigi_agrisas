import { inventoryQuantityOf } from "@/shared/domain/services/inventoryQuantityOf";

describe("inventoryQuantityOf", () => {
  it("returns quantity unchanged when numPartsSnapshot is null", () => {
    expect(inventoryQuantityOf(5, null)).toBe(5);
  });

  it("divides quantity by numPartsSnapshot when present", () => {
    expect(inventoryQuantityOf(3, 4)).toBeCloseTo(0.75, 10);
  });

  it("allows quantity greater than numParts (more than one full container)", () => {
    expect(inventoryQuantityOf(6, 4)).toBeCloseTo(1.5, 10);
  });
});
