import { InMemoryTaxRateRepository } from "@/modules/tax-rates/infrastructure/repositories/InMemoryTaxRateRepository";
import { CreateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/CreateTaxRateUseCase";
import { TaxRateCodeAlreadyInUseError } from "@/modules/tax-rates/domain/errors";

function baseRequest(overrides: Partial<Parameters<CreateTaxRateUseCase["execute"]>[0]> = {}) {
  return {
    code: "IVA_16",
    name: "IVA 16%",
    satTaxCode: "002",
    factorType: "Tasa",
    displayValue: 16,
    rate: 0.16,
    ...overrides,
  };
}

describe("CreateTaxRateUseCase", () => {
  it("creates a tax rate with SAT classification fields", async () => {
    const repo = new InMemoryTaxRateRepository();
    const result = await new CreateTaxRateUseCase(repo).execute(baseRequest());

    expect(result.code).toBe("IVA_16");
    expect(result.satTaxCode).toBe("002");
    expect(result.factorType).toBe("Tasa");
    expect(result.displayValue).toBe(16);
    expect(result.rate).toBe(0.16);
    expect(result.transferredAccount).toBeNull();
    expect(result.isActive).toBe(true);
  });

  it("persists optional accounting accounts when provided", async () => {
    const repo = new InMemoryTaxRateRepository();
    const result = await new CreateTaxRateUseCase(repo).execute(
      baseRequest({
        transferredAccount: "1101",
        pendingTransferredAccount: "1102",
        creditedAccount: "2101",
        pendingCreditedAccount: "2102",
      })
    );

    expect(result.transferredAccount).toBe("1101");
    expect(result.pendingTransferredAccount).toBe("1102");
    expect(result.creditedAccount).toBe("2101");
    expect(result.pendingCreditedAccount).toBe("2102");
  });

  it("throws TaxRateCodeAlreadyInUseError on duplicate code", async () => {
    const repo = new InMemoryTaxRateRepository();
    await new CreateTaxRateUseCase(repo).execute(baseRequest());
    await expect(new CreateTaxRateUseCase(repo).execute(baseRequest({ name: "IVA 16% duplicado" }))).rejects.toThrow(
      TaxRateCodeAlreadyInUseError
    );
  });

  it("normalizes code to uppercase and trimmed", async () => {
    const repo = new InMemoryTaxRateRepository();
    const result = await new CreateTaxRateUseCase(repo).execute(baseRequest({ code: " ieps_8 " }));
    expect(result.code).toBe("IEPS_8");
  });
});
