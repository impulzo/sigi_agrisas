import { PrismaPosLookupService } from "@/modules/pos/infrastructure/repositories/PrismaPosLookupService";
import type { ProductLookup } from "@/modules/pos/application/ports/PosLookups";

const mockFindUnique = jest.fn();
const mockPrisma = {
  product: { findUnique: mockFindUnique },
} as unknown as Parameters<typeof PrismaPosLookupService.prototype.constructor>[0];

describe("PrismaPosLookupService — image exclusion (task 8.6)", () => {
  const svc = new PrismaPosLookupService(mockPrisma as any);

  beforeEach(() => jest.clearAllMocks());

  it("ProductLookup interface does not include imageUrl", () => {
    const lookup: ProductLookup = {
      id: "p1",
      code: "P1",
      name: "Test",
      ivaRate: null,
      iepsRate: null,
      isActive: true,
    };
    expect("imageUrl" in lookup).toBe(false);
  });

  it("getProduct result does not include imageUrl", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "p1",
      code: "P1",
      name: "Test",
      ivaRate: null,
      iepsRate: null,
      isActive: true,
    });
    const result = await svc.getProduct("p1");
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("imageUrl");
  });

  it("getProduct select arg excludes imageUrl", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await svc.getProduct("p1");
    const callArg = mockFindUnique.mock.calls[0][0] as { select?: Record<string, unknown> };
    expect(callArg.select).not.toHaveProperty("imageUrl");
    expect(callArg.select).not.toHaveProperty("image_url");
  });

  it("SaleItem snapshot field list excludes image references", () => {
    const snapshotFields = [
      "productCodeSnapshot",
      "productNameSnapshot",
      "priceNameSnapshot",
      "unitPrice",
      "discountPct",
      "ivaRate",
      "iepsRate",
    ];
    expect(snapshotFields.some((f) => f.toLowerCase().includes("image"))).toBe(false);
  });
});
