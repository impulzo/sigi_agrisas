import { UpdateProviderUseCase } from "@/modules/providers/application/use-cases/UpdateProviderUseCase";
import { CreateProviderUseCase } from "@/modules/providers/application/use-cases/CreateProviderUseCase";
import { InMemoryProviderRepository } from "@/modules/providers/infrastructure/repositories/InMemoryProviderRepository";
import { ProviderNotFoundError } from "@/modules/providers/domain/errors/ProviderNotFoundError";
import { ProviderRfcAlreadyInUseError } from "@/modules/providers/domain/errors/ProviderRfcAlreadyInUseError";

describe("UpdateProviderUseCase", () => {
  let repo: InMemoryProviderRepository;
  let createUseCase: CreateProviderUseCase;
  let updateUseCase: UpdateProviderUseCase;

  beforeEach(() => {
    repo = new InMemoryProviderRepository();
    (repo as any).reset?.();
    createUseCase = new CreateProviderUseCase(repo);
    updateUseCase = new UpdateProviderUseCase(repo);
  });

  it("updates a single field", async () => {
    const created = await createUseCase.execute({ code: "PROV001", name: "Original", rfc: "XAXX010101000" });
    const updated = await updateUseCase.execute(created.id, { name: "Updated" });
    expect(updated.name).toBe("Updated");
    expect(updated.code).toBe("PROV001");
  });

  it("ignores code if present in update (code is immutable)", async () => {
    const created = await createUseCase.execute({ code: "PROV001", name: "Original", rfc: "XAXX010101000" });
    const updated = await updateUseCase.execute(created.id, { name: "Updated" });
    expect(updated.code).toBe("PROV001");
  });

  it("throws ProviderNotFoundError when provider does not exist", async () => {
    await expect(updateUseCase.execute("non-existent", { name: "Updated" })).rejects.toThrow(ProviderNotFoundError);
  });

  it("throws ProviderRfcAlreadyInUseError on duplicate rfc", async () => {
    await createUseCase.execute({ code: "PROV001", name: "Proveedor 1", rfc: "XAXX010101000" });
    const p2 = await createUseCase.execute({ code: "PROV002", name: "Proveedor 2", rfc: "XEXX010101000" });
    await expect(updateUseCase.execute(p2.id, { rfc: "XAXX010101000" })).rejects.toThrow(ProviderRfcAlreadyInUseError);
  });

  it("clears optional field with null", async () => {
    const created = await createUseCase.execute({
      code: "PROV001",
      name: "Original",
      rfc: "XAXX010101000",
      legalName: "Razón Social S.A.",
    });
    const updated = await updateUseCase.execute(created.id, { legalName: null });
    expect(updated.legalName).toBeNull();
  });

  it("reactivates an inactive provider via isActive: true", async () => {
    const created = await createUseCase.execute({ code: "PROV001", name: "Original", rfc: "XAXX010101000" });
    await repo.softDelete(created.id);
    const reactivated = await updateUseCase.execute(created.id, { isActive: true });
    expect(reactivated.isActive).toBe(true);
  });
});
