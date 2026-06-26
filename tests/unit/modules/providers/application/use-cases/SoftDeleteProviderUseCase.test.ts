import { SoftDeleteProviderUseCase } from "@/modules/providers/application/use-cases/SoftDeleteProviderUseCase";
import { CreateProviderUseCase } from "@/modules/providers/application/use-cases/CreateProviderUseCase";
import { InMemoryProviderRepository } from "@/modules/providers/infrastructure/repositories/InMemoryProviderRepository";
import { ProviderNotFoundError } from "@/modules/providers/domain/errors/ProviderNotFoundError";
import { ProviderHasDepartmentsError } from "@/modules/providers/domain/errors/ProviderHasDepartmentsError";

describe("SoftDeleteProviderUseCase", () => {
  let repo: InMemoryProviderRepository;
  let createUseCase: CreateProviderUseCase;
  let softDeleteUseCase: SoftDeleteProviderUseCase;

  beforeEach(() => {
    repo = new InMemoryProviderRepository();
    (repo as any).reset?.();
    createUseCase = new CreateProviderUseCase(repo);
    softDeleteUseCase = new SoftDeleteProviderUseCase(repo);
  });

  it("marks an active provider as inactive", async () => {
    const created = await createUseCase.execute({ code: "PROV001", name: "Proveedor", rfc: "XAXX010101000" });
    expect(created.isActive).toBe(true);

    await softDeleteUseCase.execute(created.id);

    const after = await repo.findById(created.id);
    expect(after?.isActive).toBe(false);
  });

  it("is idempotent (inactive → inactive)", async () => {
    const created = await createUseCase.execute({ code: "PROV001", name: "Proveedor", rfc: "XAXX010101000" });
    await softDeleteUseCase.execute(created.id);
    await softDeleteUseCase.execute(created.id);
    const after = await repo.findById(created.id);
    expect(after?.isActive).toBe(false);
  });

  it("throws ProviderNotFoundError when provider does not exist", async () => {
    await expect(softDeleteUseCase.execute("non-existent-id")).rejects.toThrow(ProviderNotFoundError);
  });

  it("throws ProviderHasDepartmentsError when provider has active departments", async () => {
    const created = await createUseCase.execute({ code: "PROV001", name: "Proveedor", rfc: "XAXX010101000" });
    repo.setActiveDepartmentCount(created.id, 2);
    await expect(softDeleteUseCase.execute(created.id)).rejects.toThrow(ProviderHasDepartmentsError);
    const after = await repo.findById(created.id);
    expect(after?.isActive).toBe(true);
  });

  it("succeeds when provider has only inactive departments (count = 0)", async () => {
    const created = await createUseCase.execute({ code: "PROV002", name: "Proveedor 2", rfc: "XAXX010101001" });
    repo.setActiveDepartmentCount(created.id, 0);
    await softDeleteUseCase.execute(created.id);
    const after = await repo.findById(created.id);
    expect(after?.isActive).toBe(false);
  });
});
