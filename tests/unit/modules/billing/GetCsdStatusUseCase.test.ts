import { GetCsdStatusUseCase } from "../../../../src/modules/billing/application/use-cases/GetCsdStatusUseCase";
import type { FacturamaGateway, FacturamaCsdStatus } from "../../../../src/modules/billing/application/ports/FacturamaGateway";
import type { EmitterFiscalSettingsStore } from "../../../../src/modules/billing/application/ports/EmitterFiscalSettingsStore";

function makeGateway(status: FacturamaCsdStatus): FacturamaGateway {
  return {
    stamp: jest.fn(),
    cancel: jest.fn(),
    download: jest.fn(),
    uploadCsd: jest.fn(),
    getCsdStatus: jest.fn(async () => status),
  };
}

function makeStore(getResult: Awaited<ReturnType<EmitterFiscalSettingsStore["get"]>>): EmitterFiscalSettingsStore {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    upsert: jest.fn(),
  };
}

describe("GetCsdStatusUseCase", () => {
  it("merges Facturama status with persisted fiscal settings", async () => {
    const store = makeStore({ legalName: "Agrisas", fiscalRegime: "601", zipCode: "83000", address: "Calle Falsa 123" });
    const gateway = makeGateway({ rfc: "XAXX010101000", expiresAt: "2027-01-01", isValid: true });
    const useCase = new GetCsdStatusUseCase(gateway, store);

    const result = await useCase.execute();

    expect(result).toEqual({
      rfc: "XAXX010101000",
      expiresAt: "2027-01-01",
      isValid: true,
      legalName: "Agrisas",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Calle Falsa 123",
    });
  });

  it("returns null fiscal fields when never captured", async () => {
    const store = makeStore(null);
    const gateway = makeGateway({ rfc: "XAXX010101000", isValid: true });
    const useCase = new GetCsdStatusUseCase(gateway, store);

    const result = await useCase.execute();

    expect(result.legalName).toBeNull();
    expect(result.fiscalRegime).toBeNull();
    expect(result.zipCode).toBeNull();
    expect(result.address).toBeNull();
  });
});
