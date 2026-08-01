import { InMemoryTaxRateRepository } from "@/modules/tax-rates/infrastructure/repositories/InMemoryTaxRateRepository";
import { CreateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/CreateTaxRateUseCase";
import { UpdateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/UpdateTaxRateUseCase";
import { TaxRateNotFoundError } from "@/modules/tax-rates/domain/errors";

async function seedTaxRate(repo: InMemoryTaxRateRepository) {
  return new CreateTaxRateUseCase(repo).execute({
    code: "IEPS_8",
    name: "IEPS 8%",
    satTaxCode: "003",
    factorType: "Tasa",
    displayValue: 8,
    rate: 0.08,
  });
}

describe("UpdateTaxRateUseCase", () => {
  it("updates SAT classification fields", async () => {
    const repo = new InMemoryTaxRateRepository();
    const created = await seedTaxRate(repo);

    const result = await new UpdateTaxRateUseCase(repo).execute(created.id, {
      satTaxCode: "002",
      factorType: "Cuota",
      displayValue: 5,
      rate: 5,
    });

    expect(result.satTaxCode).toBe("002");
    expect(result.factorType).toBe("Cuota");
    expect(result.displayValue).toBe(5);
    expect(result.rate).toBe(5);
  });

  it("updates accounting accounts", async () => {
    const repo = new InMemoryTaxRateRepository();
    const created = await seedTaxRate(repo);

    const result = await new UpdateTaxRateUseCase(repo).execute(created.id, {
      transferredAccount: "1101",
      creditedAccount: "2101",
    });

    expect(result.transferredAccount).toBe("1101");
    expect(result.creditedAccount).toBe("2101");
    expect(result.pendingTransferredAccount).toBeNull();
  });

  it("does not change code", async () => {
    const repo = new InMemoryTaxRateRepository();
    const created = await seedTaxRate(repo);

    const result = await new UpdateTaxRateUseCase(repo).execute(created.id, { name: "IEPS 8% actualizado" });

    expect(result.code).toBe("IEPS_8");
    expect(result.name).toBe("IEPS 8% actualizado");
  });

  it("throws TaxRateNotFoundError for unknown id", async () => {
    const repo = new InMemoryTaxRateRepository();
    await expect(new UpdateTaxRateUseCase(repo).execute("ghost", { name: "N" })).rejects.toThrow(TaxRateNotFoundError);
  });
});
