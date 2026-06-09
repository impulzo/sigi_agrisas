import { ListProductDosificationsUseCase } from "@/modules/products/application/use-cases/ListProductDosificationsUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryProductPriceRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductPriceRepository";
import { InMemoryProductDosificationRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductDosificationRepository";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";

const DEPT = "11111111-1111-1111-1111-111111111111";

describe("ListProductDosificationsUseCase", () => {
  let productRepo: InMemoryProductRepository;
  let priceRepo: InMemoryProductPriceRepository;
  let dosificationRepo: InMemoryProductDosificationRepository;
  let useCase: ListProductDosificationsUseCase;
  let productId: string;

  beforeEach(async () => {
    productRepo = new InMemoryProductRepository();
    productRepo.reset();
    priceRepo = new InMemoryProductPriceRepository();
    priceRepo.reset();
    dosificationRepo = new InMemoryProductDosificationRepository();
    dosificationRepo.reset();
    useCase = new ListProductDosificationsUseCase(productRepo, priceRepo, dosificationRepo);
    const created = await productRepo.create({ code: "P1", name: "Producto", unit: "kg", departmentId: DEPT });
    productId = created.product.id;
    await dosificationRepo.create({ productId, name: "Por dosis", numParts: 10, isActive: true });
  });

  it("computes computedUnitPrice when a default price exists (100 / 10 * 1.07)", async () => {
    await priceRepo.create({ productId, name: "Menudeo", price: 100, minQuantity: 1, isDefault: true });
    const result = await useCase.execute(productId);
    expect(result.items[0].requiresDefaultPrice).toBe(false);
    expect(result.items[0].computedUnitPrice).toBeCloseTo(10.7, 10);
  });

  it("returns null computedUnitPrice and requiresDefaultPrice=true when no default price", async () => {
    const result = await useCase.execute(productId);
    expect(result.items[0].computedUnitPrice).toBeNull();
    expect(result.items[0].requiresDefaultPrice).toBe(true);
  });

  it("throws ProductNotFoundError when the product does not exist", async () => {
    await expect(useCase.execute("nope")).rejects.toThrow(ProductNotFoundError);
  });
});
