import { SoftDeleteProductUseCase } from "@/modules/products/application/use-cases/SoftDeleteProductUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";

const DEPT = "11111111-1111-1111-1111-111111111111";

describe("SoftDeleteProductUseCase", () => {
  let repo: InMemoryProductRepository;
  let useCase: SoftDeleteProductUseCase;
  let productId: string;

  beforeEach(async () => {
    repo = new InMemoryProductRepository();
    repo.reset();
    useCase = new SoftDeleteProductUseCase(repo);
    const created = await repo.create({ code: "P1", name: "Arroz", unit: "kg", departmentId: DEPT });
    productId = created.product.id;
  });

  it("marks the product inactive", async () => {
    await useCase.execute(productId);
    const found = await repo.findById(productId);
    expect(found?.product.isActive).toBe(false);
  });

  it("is idempotent (a second delete still succeeds)", async () => {
    await useCase.execute(productId);
    await expect(useCase.execute(productId)).resolves.toBeUndefined();
  });

  it("throws ProductNotFoundError when not found", async () => {
    await expect(useCase.execute("nope")).rejects.toThrow(ProductNotFoundError);
  });
});
