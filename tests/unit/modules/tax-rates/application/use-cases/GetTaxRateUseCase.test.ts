import { InMemoryTaxRateRepository } from "@/modules/tax-rates/infrastructure/repositories/InMemoryTaxRateRepository";
import { CreateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/CreateTaxRateUseCase";
import { DeactivateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/DeactivateTaxRateUseCase";
import { GetTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/GetTaxRateUseCase";
import { TaxRateNotFoundError } from "@/modules/tax-rates/domain/errors";

async function seedTaxRate(repo: InMemoryTaxRateRepository) {
  return new CreateTaxRateUseCase(repo).execute({
    code: "IVA_16",
    name: "IVA 16%",
    satTaxCode: "002",
    factorType: "Tasa",
    displayValue: 16,
    rate: 0.16,
  });
}

describe("GetTaxRateUseCase", () => {
  it("returns the tax rate by id", async () => {
    const repo = new InMemoryTaxRateRepository();
    const created = await seedTaxRate(repo);

    const result = await new GetTaxRateUseCase(repo).execute(created.id);

    expect(result.id).toBe(created.id);
    expect(result.code).toBe("IVA_16");
  });

  it("returns an inactive tax rate regardless of isActive", async () => {
    const repo = new InMemoryTaxRateRepository();
    const created = await seedTaxRate(repo);
    await new DeactivateTaxRateUseCase(repo).execute(created.id);

    const result = await new GetTaxRateUseCase(repo).execute(created.id);

    expect(result.isActive).toBe(false);
  });

  it("throws TaxRateNotFoundError for unknown id", async () => {
    const repo = new InMemoryTaxRateRepository();
    await expect(new GetTaxRateUseCase(repo).execute("ghost")).rejects.toThrow(TaxRateNotFoundError);
  });
});
