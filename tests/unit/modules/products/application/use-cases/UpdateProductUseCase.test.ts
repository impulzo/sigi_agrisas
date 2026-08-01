import { UpdateProductUseCase } from "@/modules/products/application/use-cases/UpdateProductUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryDepartmentRepository } from "@/modules/departments/infrastructure/repositories/InMemoryDepartmentRepository";
import { InMemoryTaxRateRepository } from "@/modules/tax-rates/infrastructure/repositories/InMemoryTaxRateRepository";
import { CreateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/CreateTaxRateUseCase";
import { DeactivateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/DeactivateTaxRateUseCase";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";
import { ProductTaxRateNotFoundError } from "@/modules/products/domain/errors/ProductTaxRateNotFoundError";

describe("UpdateProductUseCase", () => {
  let repo: InMemoryProductRepository;
  let deptRepo: InMemoryDepartmentRepository;
  let taxRateRepo: InMemoryTaxRateRepository;
  let useCase: UpdateProductUseCase;
  let departmentId: string;
  let productId: string;

  beforeEach(async () => {
    repo = new InMemoryProductRepository();
    repo.reset();
    deptRepo = new InMemoryDepartmentRepository();
    const dept = await deptRepo.create({ code: "DEPT1", name: "Abarrotes" });
    departmentId = dept.id;
    taxRateRepo = new InMemoryTaxRateRepository();
    useCase = new UpdateProductUseCase(repo, deptRepo, taxRateRepo);
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

  it("updates taxRateId when a valid tax rate is provided", async () => {
    const taxRate = await new CreateTaxRateUseCase(taxRateRepo).execute({
      code: "IVA_16",
      name: "IVA 16%",
      satTaxCode: "002",
      factorType: "Tasa",
      displayValue: 16,
      rate: 0.16,
    });
    const result = await useCase.execute(productId, { taxRateId: taxRate.id });
    expect(result.taxRateId).toBe(taxRate.id);
  });

  it("throws ProductTaxRateNotFoundError when taxRateId does not exist", async () => {
    await expect(
      useCase.execute(productId, { taxRateId: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow(ProductTaxRateNotFoundError);
  });

  it("throws ProductTaxRateNotFoundError when taxRateId is inactive", async () => {
    const taxRate = await new CreateTaxRateUseCase(taxRateRepo).execute({
      code: "IVA_0",
      name: "IVA 0%",
      satTaxCode: "002",
      factorType: "Tasa",
      displayValue: 0,
      rate: 0,
    });
    await new DeactivateTaxRateUseCase(taxRateRepo).execute(taxRate.id);
    await expect(
      useCase.execute(productId, { taxRateId: taxRate.id })
    ).rejects.toThrow(ProductTaxRateNotFoundError);
  });

  it("clearing taxRateId to null does not validate against the repo", async () => {
    const result = await useCase.execute(productId, { taxRateId: null });
    expect(result.taxRateId).toBeNull();
  });
});
