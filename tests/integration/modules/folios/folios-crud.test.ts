import { PrismaFolioRepository } from "@/modules/folios/infrastructure/repositories/PrismaFolioRepository";
import { CreateFolioUseCase } from "@/modules/folios/application/use-cases/CreateFolioUseCase";
import { GetFolioUseCase } from "@/modules/folios/application/use-cases/GetFolioUseCase";
import { ListFoliosUseCase } from "@/modules/folios/application/use-cases/ListFoliosUseCase";
import { UpdateFolioUseCase } from "@/modules/folios/application/use-cases/UpdateFolioUseCase";
import { SoftDeleteFolioUseCase } from "@/modules/folios/application/use-cases/SoftDeleteFolioUseCase";
import { prisma } from "@/shared/infrastructure/prisma/client";

const CODE = `TEST_FOL_${Date.now()}`;

afterAll(async () => {
  await prisma.folio.deleteMany({ where: { code: { startsWith: "TEST_FOL_" } } });
  await prisma.$disconnect();
});

describe("Folio CRUD integration", () => {
  const repo = new PrismaFolioRepository(prisma);
  const createUC = new CreateFolioUseCase(repo);
  const getUC = new GetFolioUseCase(repo);
  const listUC = new ListFoliosUseCase(repo);
  const updateUC = new UpdateFolioUseCase(repo);
  const softDeleteUC = new SoftDeleteFolioUseCase(repo);

  let createdId: string;

  it("creates a folio with prefix and currentNumber", async () => {
    const result = await createUC.execute({ code: CODE, name: "Test Folio", prefix: "TST-", scope: "OPERATIONS", currentNumber: 100 });
    expect(result.id).toBeDefined();
    expect(result.prefix).toBe("TST-");
    expect(result.currentNumber).toBe(100);
    createdId = result.id;
  });

  it("gets by id", async () => {
    const result = await getUC.execute(createdId);
    expect(result.currentNumber).toBe(100);
  });

  it("appears in list", async () => {
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: false });
    expect(result.items.some((f) => f.id === createdId)).toBe(true);
  });

  it("updates currentNumber", async () => {
    const result = await updateUC.execute({ id: createdId, currentNumber: 999 });
    expect(result.currentNumber).toBe(999);
  });

  it("soft-deletes: hidden from default list", async () => {
    await softDeleteUC.execute(createdId);
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: false });
    expect(result.items.some((f) => f.id === createdId)).toBe(false);
  });

  it("soft-deleted folio visible with includeInactive=true", async () => {
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: true });
    expect(result.items.some((f) => f.id === createdId)).toBe(true);
  });
});
