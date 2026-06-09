import { GetProviderUseCase } from "@/modules/providers/application/use-cases/GetProviderUseCase";
import { InMemoryProviderRepository } from "@/modules/providers/infrastructure/repositories/InMemoryProviderRepository";
import { ProviderNotFoundError } from "@/modules/providers/domain/errors/ProviderNotFoundError";

describe("GetProviderUseCase", () => {
  let repo: InMemoryProviderRepository;
  let useCase: GetProviderUseCase;

  beforeEach(() => {
    repo = new InMemoryProviderRepository();
    (repo as any).reset?.();
    useCase = new GetProviderUseCase(repo);
  });

  it("returns the provider when found", async () => {
    const created = await repo.create({ code: "PROV001", name: "Proveedor", rfc: "XAXX010101000" });
    const result = await useCase.execute(created.id);
    expect(result.id).toBe(created.id);
    expect(result.code).toBe("PROV001");
  });

  it("throws ProviderNotFoundError when not found", async () => {
    await expect(useCase.execute("non-existent-id")).rejects.toThrow(ProviderNotFoundError);
  });
});
