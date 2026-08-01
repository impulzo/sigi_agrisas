import { InMemoryTaxRateRepository } from "@/modules/tax-rates/infrastructure/repositories/InMemoryTaxRateRepository";
import { CreateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/CreateTaxRateUseCase";
import { DeactivateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/DeactivateTaxRateUseCase";
import { TaxRateNotFoundError, TaxRateInUseByProductsError } from "@/modules/tax-rates/domain/errors";

async function seedTaxRate(repo: InMemoryTaxRateRepository) {
  return new CreateTaxRateUseCase(repo).execute({
    code: "IVA_0",
    name: "IVA 0%",
    satTaxCode: "002",
    factorType: "Tasa",
    displayValue: 0,
    rate: 0,
  });
}

describe("DeactivateTaxRateUseCase", () => {
  it("deactivates a tax rate with no active products", async () => {
    const repo = new InMemoryTaxRateRepository();
    const created = await seedTaxRate(repo);

    const result = await new DeactivateTaxRateUseCase(repo).execute(created.id);

    expect(result.isActive).toBe(false);
  });

  it("throws TaxRateInUseByProductsError when active products reference it", async () => {
    const repo = new InMemoryTaxRateRepository();
    const created = await seedTaxRate(repo);
    repo.setActiveProductCount(created.id, 3);

    await expect(new DeactivateTaxRateUseCase(repo).execute(created.id)).rejects.toThrow(TaxRateInUseByProductsError);
    await expect(new DeactivateTaxRateUseCase(repo).execute(created.id)).rejects.toMatchObject({ count: 3 });
  });

  it("is idempotent when tax rate is already inactive", async () => {
    const repo = new InMemoryTaxRateRepository();
    const created = await seedTaxRate(repo);
    await new DeactivateTaxRateUseCase(repo).execute(created.id);

    const result = await new DeactivateTaxRateUseCase(repo).execute(created.id);

    expect(result.isActive).toBe(false);
  });

  it("throws TaxRateNotFoundError for unknown id", async () => {
    const repo = new InMemoryTaxRateRepository();
    await expect(new DeactivateTaxRateUseCase(repo).execute("ghost")).rejects.toThrow(TaxRateNotFoundError);
  });
});
