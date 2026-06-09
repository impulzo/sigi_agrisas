import { UpdateProductUseCase } from "@/modules/products/application/use-cases/UpdateProductUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryDepartmentRepository } from "@/modules/departments/infrastructure/repositories/InMemoryDepartmentRepository";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";

describe("UpdateProductUseCase", () => {
  let repo: InMemoryProductRepository;
  let deptRepo: InMemoryDepartmentRepository;
  let useCase: UpdateProductUseCase;
  let departmentId: string;
  let productId: string;

  beforeEach(async () => {
    repo = new InMemoryProductRepository();
    repo.reset();
    deptRepo = new InMemoryDepartmentRepository();
    const dept = await deptRepo.create({ code: "DEPT1", name: "Abarrotes" });
    departmentId = dept.id;
    useCase = new UpdateProductUseCase(repo, deptRepo);
    const created = await repo.create({ code: "P1", name: "Arroz", unit: "kg", departmentId });
    productId = created.product.id;
  });

  it("updates name and tax rate", async () => {
    const result = await useCase.execute(productId, { name: "Arroz Integral", ivaRate: 0 });
    expect(result.name).toBe("Arroz Integral");
    expect(result.ivaRate).toBe(0);
  });

  it("clears an optional field when set to null", async () => {
    await useCase.execute(productId, { satProductCode: "12345678" });
    const result = await useCase.execute(productId, { satProductCode: null });
    expect(result.satProductCode).toBeNull();
  });

  it("throws ProductNotFoundError for a missing product", async () => {
    await expect(useCase.execute("nope", { name: "X" })).rejects.toThrow(ProductNotFoundError);
  });
});
