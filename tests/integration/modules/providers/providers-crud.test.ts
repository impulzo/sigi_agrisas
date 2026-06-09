import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaProviderRepository } from "@/modules/providers/infrastructure/repositories/PrismaProviderRepository";
import { ListProvidersUseCase } from "@/modules/providers/application/use-cases/ListProvidersUseCase";
import { GetProviderUseCase } from "@/modules/providers/application/use-cases/GetProviderUseCase";
import { CreateProviderUseCase } from "@/modules/providers/application/use-cases/CreateProviderUseCase";
import { UpdateProviderUseCase } from "@/modules/providers/application/use-cases/UpdateProviderUseCase";
import { SoftDeleteProviderUseCase } from "@/modules/providers/application/use-cases/SoftDeleteProviderUseCase";
import { ProviderNotFoundError } from "@/modules/providers/domain/errors/ProviderNotFoundError";
import { ProviderCodeAlreadyInUseError } from "@/modules/providers/domain/errors/ProviderCodeAlreadyInUseError";
import { ProviderRfcAlreadyInUseError } from "@/modules/providers/domain/errors/ProviderRfcAlreadyInUseError";

const TEST_CODE = "INTTEST001";
const TEST_RFC = "XAXX010101001";

afterAll(async () => {
  await prisma.provider.deleteMany({ where: { code: { startsWith: "INTTEST" } } });
  await prisma.$disconnect();
});

describe("Providers CRUD — integration (real DB)", () => {
  let repo: PrismaProviderRepository;
  let listUseCase: ListProvidersUseCase;
  let getUseCase: GetProviderUseCase;
  let createUseCase: CreateProviderUseCase;
  let updateUseCase: UpdateProviderUseCase;
  let softDeleteUseCase: SoftDeleteProviderUseCase;
  let createdId: string;

  beforeAll(async () => {
    await prisma.provider.deleteMany({ where: { code: { startsWith: "INTTEST" } } });
    repo = new PrismaProviderRepository(prisma);
    listUseCase = new ListProvidersUseCase(repo);
    getUseCase = new GetProviderUseCase(repo);
    createUseCase = new CreateProviderUseCase(repo);
    updateUseCase = new UpdateProviderUseCase(repo);
    softDeleteUseCase = new SoftDeleteProviderUseCase(repo);
  });

  it("creates a provider with minimum fields", async () => {
    const result = await createUseCase.execute({ code: TEST_CODE, name: "Proveedor Integración", rfc: TEST_RFC });
    createdId = result.id;
    expect(result.code).toBe(TEST_CODE);
    expect(result.rfc).toBe(TEST_RFC);
    expect(result.isActive).toBe(true);
  });

  it("gets the created provider by id", async () => {
    const result = await getUseCase.execute(createdId);
    expect(result.id).toBe(createdId);
    expect(result.code).toBe(TEST_CODE);
  });

  it("lists providers and finds the created one", async () => {
    const result = await listUseCase.execute({ page: 1, pageSize: 100, includeInactive: false });
    const found = result.items.find((p) => p.id === createdId);
    expect(found).toBeDefined();
  });

  it("updates provider: adds legalName and taxRegime", async () => {
    const updated = await updateUseCase.execute(createdId, { legalName: "Razón Social S.A.", taxRegime: "601" });
    expect(updated.legalName).toBe("Razón Social S.A.");
    expect(updated.taxRegime).toBe("601");
  });

  it("searches by RFC", async () => {
    const result = await listUseCase.execute({ page: 1, pageSize: 20, includeInactive: false, search: TEST_RFC.slice(0, 4) });
    const found = result.items.find((p) => p.id === createdId);
    expect(found).toBeDefined();
  });

  it("provider is visible in list (active)", async () => {
    const result = await listUseCase.execute({ page: 1, pageSize: 100, includeInactive: false });
    const found = result.items.find((p) => p.id === createdId);
    expect(found).toBeDefined();
    expect(found?.isActive).toBe(true);
  });

  it("soft deletes the provider", async () => {
    await softDeleteUseCase.execute(createdId);
    const result = await listUseCase.execute({ page: 1, pageSize: 100, includeInactive: false });
    const found = result.items.find((p) => p.id === createdId);
    expect(found).toBeUndefined();
  });

  it("shows inactive provider with includeInactive=true", async () => {
    const result = await listUseCase.execute({ page: 1, pageSize: 100, includeInactive: true });
    const found = result.items.find((p) => p.id === createdId);
    expect(found).toBeDefined();
    expect(found?.isActive).toBe(false);
  });

  it("reactivates provider via PATCH isActive: true", async () => {
    const reactivated = await updateUseCase.execute(createdId, { isActive: true });
    expect(reactivated.isActive).toBe(true);
  });

  it("rejects duplicate code on create", async () => {
    await expect(
      createUseCase.execute({ code: TEST_CODE, name: "Duplicado", rfc: "XEXX010101000" })
    ).rejects.toThrow(ProviderCodeAlreadyInUseError);
  });

  it("rejects duplicate rfc on create", async () => {
    await expect(
      createUseCase.execute({ code: "INTTEST002", name: "Duplicado RFC", rfc: TEST_RFC })
    ).rejects.toThrow(ProviderRfcAlreadyInUseError);
  });

  it("throws ProviderNotFoundError for non-existent id", async () => {
    await expect(getUseCase.execute("00000000-0000-0000-0000-000000000000")).rejects.toThrow(ProviderNotFoundError);
  });
});
