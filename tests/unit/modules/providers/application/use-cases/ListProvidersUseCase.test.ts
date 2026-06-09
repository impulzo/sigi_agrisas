import { ListProvidersUseCase } from "@/modules/providers/application/use-cases/ListProvidersUseCase";
import { InMemoryProviderRepository } from "@/modules/providers/infrastructure/repositories/InMemoryProviderRepository";

const SAMPLE_CODE = "PROV001";
const SAMPLE_RFC = "XAXX010101000";

async function createProvider(repo: InMemoryProviderRepository, overrides: Partial<{ code: string; name: string; rfc: string }> = {}) {
  return repo.create({
    code: overrides.code ?? SAMPLE_CODE,
    name: overrides.name ?? "Proveedor Ejemplo",
    rfc: overrides.rfc ?? SAMPLE_RFC,
  });
}

describe("ListProvidersUseCase", () => {
  let repo: InMemoryProviderRepository;
  let useCase: ListProvidersUseCase;

  beforeEach(() => {
    repo = new InMemoryProviderRepository();
    (repo as any).reset?.();
    useCase = new ListProvidersUseCase(repo);
  });

  it("returns empty list when no providers exist", async () => {
    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("returns active providers by default", async () => {
    await createProvider(repo);
    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("hides inactive providers when includeInactive is false", async () => {
    const p = await createProvider(repo);
    await repo.softDelete(p.id);
    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("shows inactive providers when includeInactive is true", async () => {
    const p = await createProvider(repo);
    await repo.softDelete(p.id);
    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: true });
    expect(result.items).toHaveLength(1);
  });

  it("paginates correctly", async () => {
    await createProvider(repo, { code: "P001", rfc: "XAXX010101000" });
    await createProvider(repo, { code: "P002", rfc: "XEXX010101000" });
    await createProvider(repo, { code: "P003", rfc: "AAAA010101AAA" });

    const page1 = await useCase.execute({ page: 1, pageSize: 2, includeInactive: false });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(3);

    const page2 = await useCase.execute({ page: 2, pageSize: 2, includeInactive: false });
    expect(page2.items).toHaveLength(1);
  });

  it("caps pageSize at 100", async () => {
    const result = await useCase.execute({ page: 1, pageSize: 999, includeInactive: false });
    expect(result.pageSize).toBe(100);
  });

  it("filters by name case-insensitively", async () => {
    await createProvider(repo, { code: "P001", name: "Acme Corp", rfc: "XAXX010101000" });
    await createProvider(repo, { code: "P002", name: "Beta Inc", rfc: "XEXX010101000" });

    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false, search: "acme" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Acme Corp");
  });

  it("filters by rfc case-insensitively", async () => {
    await createProvider(repo, { code: "P001", rfc: "XAXX010101000" });
    await createProvider(repo, { code: "P002", rfc: "XEXX010101000" });

    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false, search: "xaxx" });
    expect(result.items).toHaveLength(1);
  });
});
