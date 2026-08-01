import { randomUUID } from "crypto";
import { TaxRate } from "@/modules/tax-rates/domain/entities/TaxRate";
import { InMemoryTaxRateRepository } from "@/modules/tax-rates/infrastructure/repositories/InMemoryTaxRateRepository";
import { CreateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/CreateTaxRateUseCase";
import { DeactivateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/DeactivateTaxRateUseCase";
import { ListTaxRatesUseCase } from "@/modules/tax-rates/application/use-cases/ListTaxRatesUseCase";

async function seedTaxRate(repo: InMemoryTaxRateRepository, code: string) {
  return new CreateTaxRateUseCase(repo).execute({
    code,
    name: code,
    satTaxCode: "002",
    factorType: "Tasa",
    displayValue: 0,
    rate: 0,
  });
}

function seedAt(repo: InMemoryTaxRateRepository, code: string, createdAt: Date): TaxRate {
  const taxRate = TaxRate.create({
    id: randomUUID(),
    code,
    name: code,
    description: null,
    satTaxCode: "002",
    factorType: "Tasa",
    displayValue: 0,
    rate: 0,
    transferredAccount: null,
    pendingTransferredAccount: null,
    creditedAccount: null,
    pendingCreditedAccount: null,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  });
  repo.seed(taxRate);
  return taxRate;
}

describe("ListTaxRatesUseCase", () => {
  it("returns items ordered by createdAt descending", async () => {
    const repo = new InMemoryTaxRateRepository();
    const first = seedAt(repo, "IVA_0", new Date("2026-01-01T00:00:00Z"));
    const second = seedAt(repo, "IEPS_8", new Date("2026-01-02T00:00:00Z"));
    const third = seedAt(repo, "IVA_16", new Date("2026-01-03T00:00:00Z"));

    const result = await new ListTaxRatesUseCase(repo).execute({ page: 1, pageSize: 20 });

    expect(result.items.map((i) => i.id)).toEqual([third.id, second.id, first.id]);
  });

  it("excludes inactive tax rates by default", async () => {
    const repo = new InMemoryTaxRateRepository();
    const active = await seedTaxRate(repo, "IVA_16");
    const inactive = await seedTaxRate(repo, "IVA_0");
    await new DeactivateTaxRateUseCase(repo).execute(inactive.id);

    const result = await new ListTaxRatesUseCase(repo).execute({ page: 1, pageSize: 20 });

    expect(result.items.map((i) => i.id)).toEqual([active.id]);
  });

  it("includes inactive tax rates when includeInactive is true", async () => {
    const repo = new InMemoryTaxRateRepository();
    const active = await seedTaxRate(repo, "IVA_16");
    const inactive = await seedTaxRate(repo, "IVA_0");
    await new DeactivateTaxRateUseCase(repo).execute(inactive.id);

    const result = await new ListTaxRatesUseCase(repo).execute({ page: 1, pageSize: 20, includeInactive: true });

    expect(result.total).toBe(2);
    expect(result.items.map((i) => i.id).sort()).toEqual([active.id, inactive.id].sort());
  });

  it("paginates results", async () => {
    const repo = new InMemoryTaxRateRepository();
    await seedTaxRate(repo, "A");
    await seedTaxRate(repo, "B");
    await seedTaxRate(repo, "C");

    const result = await new ListTaxRatesUseCase(repo).execute({ page: 2, pageSize: 2 });

    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(2);
  });
});
