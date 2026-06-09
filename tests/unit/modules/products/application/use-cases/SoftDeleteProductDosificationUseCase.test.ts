import { SoftDeleteProductDosificationUseCase } from "@/modules/products/application/use-cases/SoftDeleteProductDosificationUseCase";
import { InMemoryProductDosificationRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductDosificationRepository";
import { ProductDosificationNotFoundError } from "@/modules/products/domain/errors/ProductDosificationNotFoundError";

const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_PRODUCT = "99999999-9999-9999-9999-999999999999";

describe("SoftDeleteProductDosificationUseCase", () => {
  let dosificationRepo: InMemoryProductDosificationRepository;
  let useCase: SoftDeleteProductDosificationUseCase;

  beforeEach(() => {
    dosificationRepo = new InMemoryProductDosificationRepository();
    dosificationRepo.reset();
    useCase = new SoftDeleteProductDosificationUseCase(dosificationRepo);
  });

  it("marks the dosification as inactive", async () => {
    const created = await dosificationRepo.create({ productId: PRODUCT_ID, name: "Por dosis", numParts: 10, isActive: true });
    await useCase.execute(PRODUCT_ID, created.id);
    const found = await dosificationRepo.findById(created.id);
    expect(found?.isActive).toBe(false);
  });

  it("throws ProductDosificationNotFoundError for a missing dosification", async () => {
    await expect(
      useCase.execute(PRODUCT_ID, "nope")
    ).rejects.toThrow(ProductDosificationNotFoundError);
  });

  it("throws ProductDosificationNotFoundError when the dosification belongs to another product", async () => {
    const created = await dosificationRepo.create({ productId: PRODUCT_ID, name: "Por dosis", numParts: 10, isActive: true });
    await expect(
      useCase.execute(OTHER_PRODUCT, created.id)
    ).rejects.toThrow(ProductDosificationNotFoundError);
  });
});
