import { CreateProductDosificationUseCase } from "@/modules/products/application/use-cases/CreateProductDosificationUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryProductPriceRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductPriceRepository";
import { InMemoryProductDosificationRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductDosificationRepository";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";
import { DuplicateDosificationNameError } from "@/modules/products/domain/errors/DuplicateDosificationNameError";

const DEPT = "11111111-1111-1111-1111-111111111111";

describe("CreateProductDosificationUseCase", () => {
  let productRepo: InMemoryProductRepository;
  let priceRepo: InMemoryProductPriceRepository;
  let dosificationRepo: InMemoryProductDosificationRepository;
  let useCase: CreateProductDosificationUseCase;
  let productId: string;

  beforeEach(async () => {
    productRepo = new InMemoryProductRepository();
    productRepo.reset();
    priceRepo = new InMemoryProductPriceRepository();
    priceRepo.reset();
    dosificationRepo = new InMemoryProductDosificationRepository();
    dosificationRepo.reset();
    useCase = new CreateProductDosificationUseCase(productRepo, priceRepo, dosificationRepo);
    const created = await productRepo.create({ code: "P1", name: "Producto", unit: "kg", departmentId: DEPT });
    productId = created.product.id;
  });

  it("creates a dosification", async () => {
    const result = await useCase.execute(productId, { name: "Por dosis", numParts: 50 });
    expect(result.name).toBe("Por dosis");
    expect(result.numParts).toBe(50);
    expect(result.isActive).toBe(true);
  });

  it("rejects a duplicate name", async () => {
    await useCase.execute(productId, { name: "Por dosis", numParts: 10 });
    await expect(useCase.execute(productId, { name: "Por dosis", numParts: 20 })).rejects.toThrow(
      DuplicateDosificationNameError
    );
  });

  it("throws ProductNotFoundError when the product does not exist", async () => {
    await expect(useCase.execute("nope", { name: "X", numParts: 5 })).rejects.toThrow(ProductNotFoundError);
  });
});
