import { CreateProductUseCase } from "@/modules/products/application/use-cases/CreateProductUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryDepartmentRepository } from "@/modules/departments/infrastructure/repositories/InMemoryDepartmentRepository";
import { ProductCodeAlreadyInUseError } from "@/modules/products/domain/errors/ProductCodeAlreadyInUseError";
import { ProductDepartmentNotFoundError } from "@/modules/products/domain/errors/ProductDepartmentNotFoundError";

describe("CreateProductUseCase", () => {
  let repo: InMemoryProductRepository;
  let deptRepo: InMemoryDepartmentRepository;
  let useCase: CreateProductUseCase;
  let departmentId: string;

  beforeEach(async () => {
    repo = new InMemoryProductRepository();
    repo.reset();
    deptRepo = new InMemoryDepartmentRepository();
    const dept = await deptRepo.create({ code: "DEPT1", name: "Abarrotes" });
    departmentId = dept.id;
    useCase = new CreateProductUseCase(repo, deptRepo);
  });

  it("creates a product with the minimum required fields", async () => {
    const result = await useCase.execute({ code: "ARROZ_001", name: "Arroz", unit: "kg", departmentId });
    expect(result.code).toBe("ARROZ_001");
    expect(result.satProductCode).toBeNull();
    expect(result.ivaRate).toBeNull();
    expect(result.iepsRate).toBeNull();
    expect(result.isActive).toBe(true);
  });

  it("creates a product with fiscal fields", async () => {
    const result = await useCase.execute({
      code: "TEQUILA_001",
      name: "Tequila",
      unit: "lt",
      departmentId,
      satProductCode: "50202306",
      ivaRate: 0.16,
      iepsRate: 0.53,
    });
    expect(result.satProductCode).toBe("50202306");
    expect(result.ivaRate).toBe(0.16);
    expect(result.iepsRate).toBe(0.53);
  });

  it("throws ProductCodeAlreadyInUseError on duplicate code", async () => {
    await useCase.execute({ code: "DUP", name: "A", unit: "kg", departmentId });
    await expect(useCase.execute({ code: "DUP", name: "B", unit: "kg", departmentId })).rejects.toThrow(
      ProductCodeAlreadyInUseError
    );
  });

  it("throws ProductDepartmentNotFoundError when department does not exist", async () => {
    await expect(
      useCase.execute({ code: "X1", name: "X", unit: "kg", departmentId: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow(ProductDepartmentNotFoundError);
  });

  it("rejects an inactive department", async () => {
    const dept = await deptRepo.create({ code: "OLD", name: "Viejo" });
    await deptRepo.softDelete(dept.id);
    await expect(
      useCase.execute({ code: "X2", name: "X", unit: "kg", departmentId: dept.id })
    ).rejects.toThrow(ProductDepartmentNotFoundError);
  });
});
