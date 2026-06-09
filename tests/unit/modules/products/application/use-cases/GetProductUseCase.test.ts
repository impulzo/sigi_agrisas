import { GetProductUseCase } from "@/modules/products/application/use-cases/GetProductUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";

const DEPT = "11111111-1111-1111-1111-111111111111";

describe("GetProductUseCase", () => {
  let repo: InMemoryProductRepository;
  let useCase: GetProductUseCase;

  beforeEach(() => {
    repo = new InMemoryProductRepository();
    repo.reset();
    useCase = new GetProductUseCase(repo);
  });

  it("returns the product when found", async () => {
    const created = await repo.create({ code: "P1", name: "Producto", unit: "kg", departmentId: DEPT });
    const result = await useCase.execute(created.product.id);
    expect(result.id).toBe(created.product.id);
    expect(result.code).toBe("P1");
  });

  it("throws ProductNotFoundError when not found", async () => {
    await expect(useCase.execute("nope")).rejects.toThrow(ProductNotFoundError);
  });
});
