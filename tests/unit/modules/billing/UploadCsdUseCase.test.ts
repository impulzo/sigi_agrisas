import { UploadCsdUseCase } from "../../../../src/modules/billing/application/use-cases/UploadCsdUseCase";
import { upsertEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";
import type { FacturamaGateway, FacturamaCsdInput, FacturamaCsdStatus } from "../../../../src/modules/billing/application/ports/FacturamaGateway";

jest.mock("@/shared/infrastructure/emitter/emitterFiscalSettingsStore", () => ({
  upsertEmitterFiscalSettings: jest.fn(),
}));

const mockedUpsert = upsertEmitterFiscalSettings as jest.Mock;

function makeGateway(uploadCsdImpl: (input: FacturamaCsdInput) => Promise<FacturamaCsdStatus>): FacturamaGateway {
  return {
    stamp: jest.fn(),
    cancel: jest.fn(),
    download: jest.fn(),
    uploadCsd: jest.fn(uploadCsdImpl),
    getCsdStatus: jest.fn(),
  };
}

const BASE_INPUT = {
  rfc: "XAXX010101000",
  certificateBase64: "cert",
  privateKeyBase64: "key",
  privateKeyPassword: "pass",
};

describe("UploadCsdUseCase", () => {
  beforeEach(() => {
    mockedUpsert.mockReset();
  });

  it("persists fiscal data when the 4 optional fields are provided and Facturama accepts the CSD", async () => {
    const gateway = makeGateway(async () => ({ rfc: BASE_INPUT.rfc, isValid: true }));
    const useCase = new UploadCsdUseCase(gateway);

    await useCase.execute({
      ...BASE_INPUT,
      legalName: "Agrisas",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Calle Falsa 123, CDMX",
    });

    expect(mockedUpsert).toHaveBeenCalledWith({
      rfc: BASE_INPUT.rfc,
      legalName: "Agrisas",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Calle Falsa 123, CDMX",
    });
  });

  it("does not overwrite previous fiscal fields when the 4 optional fields are omitted", async () => {
    const gateway = makeGateway(async () => ({ rfc: BASE_INPUT.rfc, isValid: true }));
    const useCase = new UploadCsdUseCase(gateway);

    await useCase.execute(BASE_INPUT);

    expect(mockedUpsert).toHaveBeenCalledWith({
      rfc: BASE_INPUT.rfc,
      legalName: undefined,
      fiscalRegime: undefined,
      zipCode: undefined,
      address: undefined,
    });
  });

  it("does not persist anything when Facturama rejects the CSD", async () => {
    const gateway = makeGateway(async () => {
      throw new Error("invalid certificate");
    });
    const useCase = new UploadCsdUseCase(gateway);

    await expect(
      useCase.execute({ ...BASE_INPUT, legalName: "Agrisas", fiscalRegime: "601", zipCode: "83000" })
    ).rejects.toThrow("invalid certificate");
    expect(mockedUpsert).not.toHaveBeenCalled();
  });
});
