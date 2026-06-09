import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { CreateBranchUseCase } from "@/modules/branches/application/use-cases/CreateBranchUseCase";
import { GetBranchUseCase } from "@/modules/branches/application/use-cases/GetBranchUseCase";
import { ListBranchesUseCase } from "@/modules/branches/application/use-cases/ListBranchesUseCase";
import { UpdateBranchUseCase } from "@/modules/branches/application/use-cases/UpdateBranchUseCase";
import { SoftDeleteBranchUseCase } from "@/modules/branches/application/use-cases/SoftDeleteBranchUseCase";
import { prisma } from "@/shared/infrastructure/prisma/client";

const CODE = `TEST_BR_${Date.now()}`;

afterAll(async () => {
  await prisma.branch.deleteMany({ where: { code: { startsWith: "TEST_BR_" } } });
  await prisma.$disconnect();
});

describe("Branch CRUD integration", () => {
  const repo = new PrismaBranchRepository(prisma);
  const createUC = new CreateBranchUseCase(repo);
  const getUC = new GetBranchUseCase(repo);
  const listUC = new ListBranchesUseCase(repo);
  const updateUC = new UpdateBranchUseCase(repo);
  const softDeleteUC = new SoftDeleteBranchUseCase(repo);

  let createdId: string;

  it("creates a branch with contact data", async () => {
    const result = await createUC.execute({ code: CODE, name: "Test Branch", address: "Av. Test 1", phone: "+52 1", email: "test@agrisas.com" });
    expect(result.id).toBeDefined();
    expect(result.address).toBe("Av. Test 1");
    expect(result.email).toBe("test@agrisas.com");
    createdId = result.id;
  });

  it("gets by id", async () => {
    const result = await getUC.execute(createdId);
    expect(result.phone).toBe("+52 1");
  });

  it("appears in list", async () => {
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: false });
    expect(result.items.some((b) => b.id === createdId)).toBe(true);
  });

  it("updates address", async () => {
    const result = await updateUC.execute({ id: createdId, address: "Nueva Dir 200" });
    expect(result.address).toBe("Nueva Dir 200");
  });

  it("clears email with null", async () => {
    const result = await updateUC.execute({ id: createdId, email: null });
    expect(result.email).toBeNull();
  });

  it("soft-deletes and hides from default list", async () => {
    await softDeleteUC.execute(createdId);
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: false });
    expect(result.items.some((b) => b.id === createdId)).toBe(false);
  });

  it("visible with includeInactive=true", async () => {
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: true });
    expect(result.items.some((b) => b.id === createdId)).toBe(true);
  });
});
