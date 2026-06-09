import { CreateProviderUseCase } from "@/modules/providers/application/use-cases/CreateProviderUseCase";
import { InMemoryProviderRepository } from "@/modules/providers/infrastructure/repositories/InMemoryProviderRepository";
import { ProviderCodeAlreadyInUseError } from "@/modules/providers/domain/errors/ProviderCodeAlreadyInUseError";
import { ProviderRfcAlreadyInUseError } from "@/modules/providers/domain/errors/ProviderRfcAlreadyInUseError";

describe("CreateProviderUseCase", () => {
  let repo: InMemoryProviderRepository;
  let useCase: CreateProviderUseCase;

  beforeEach(() => {
    repo = new InMemoryProviderRepository();
    (repo as any).reset?.();
    useCase = new CreateProviderUseCase(repo);
  });

  it("creates a provider with minimum required fields", async () => {
    const result = await useCase.execute({ code: "PROV001", name: "Proveedor", rfc: "XAXX010101000" });
    expect(result.id).toBeDefined();
    expect(result.code).toBe("PROV001");
    expect(result.rfc).toBe("XAXX010101000");
    expect(result.legalName).toBeNull();
    expect(result.isActive).toBe(true);
  });

  it("creates a provider with all fiscal fields", async () => {
    const result = await useCase.execute({
      code: "PROV002",
      name: "Empresa Fiscal",
      rfc: "XEXX010101000",
      legalName: "Empresa Fiscal S.A. de C.V.",
      taxRegime: "601",
      cfdiUse: "G03",
      taxZipCode: "06600",
      email: "fiscal@empresa.com",
      phone: "5512345678",
      address: "Calle Ejemplo 123",
      contactName: "Juan Pérez",
      notes: "Proveedor certificado",
    });
    expect(result.legalName).toBe("Empresa Fiscal S.A. de C.V.");
    expect(result.taxRegime).toBe("601");
    expect(result.cfdiUse).toBe("G03");
    expect(result.taxZipCode).toBe("06600");
  });

  it("throws ProviderCodeAlreadyInUseError on duplicate code", async () => {
    await useCase.execute({ code: "PROV001", name: "Proveedor", rfc: "XAXX010101000" });
    await expect(useCase.execute({ code: "PROV001", name: "Otro", rfc: "XEXX010101000" })).rejects.toThrow(
      ProviderCodeAlreadyInUseError
    );
  });

  it("throws ProviderRfcAlreadyInUseError on duplicate rfc", async () => {
    await useCase.execute({ code: "PROV001", name: "Proveedor", rfc: "XAXX010101000" });
    await expect(useCase.execute({ code: "PROV002", name: "Otro", rfc: "XAXX010101000" })).rejects.toThrow(
      ProviderRfcAlreadyInUseError
    );
  });
});
