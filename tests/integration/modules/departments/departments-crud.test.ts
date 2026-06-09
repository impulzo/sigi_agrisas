import { PrismaDepartmentRepository } from "@/modules/departments/infrastructure/repositories/PrismaDepartmentRepository";
import { CreateDepartmentUseCase } from "@/modules/departments/application/use-cases/CreateDepartmentUseCase";
import { GetDepartmentUseCase } from "@/modules/departments/application/use-cases/GetDepartmentUseCase";
import { ListDepartmentsUseCase } from "@/modules/departments/application/use-cases/ListDepartmentsUseCase";
import { UpdateDepartmentUseCase } from "@/modules/departments/application/use-cases/UpdateDepartmentUseCase";
import { SoftDeleteDepartmentUseCase } from "@/modules/departments/application/use-cases/SoftDeleteDepartmentUseCase";
import { prisma } from "@/shared/infrastructure/prisma/client";

const CODE = `TEST_DEPT_${Date.now()}`;

afterAll(async () => {
  await prisma.department.deleteMany({ where: { code: { startsWith: "TEST_DEPT_" } } });
  await prisma.$disconnect();
});

describe("Department CRUD integration", () => {
  const repo = new PrismaDepartmentRepository(prisma);
  const createUC = new CreateDepartmentUseCase(repo);
  const getUC = new GetDepartmentUseCase(repo);
  const listUC = new ListDepartmentsUseCase(repo);
  const updateUC = new UpdateDepartmentUseCase(repo);
  const softDeleteUC = new SoftDeleteDepartmentUseCase(repo);

  let createdId: string;

  it("creates a department", async () => {
    const result = await createUC.execute({ code: CODE, name: "Test Dept", description: "Integration test" });
    expect(result.id).toBeDefined();
    expect(result.description).toBe("Integration test");
    createdId = result.id;
  });

  it("gets by id", async () => {
    expect((await getUC.execute(createdId)).code).toBe(CODE);
  });

  it("appears in list", async () => {
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: false });
    expect(result.items.some((d) => d.id === createdId)).toBe(true);
  });

  it("updates name", async () => {
    expect((await updateUC.execute({ id: createdId, name: "Updated Dept" })).name).toBe("Updated Dept");
  });

  it("soft-deletes and hides from default list", async () => {
    await softDeleteUC.execute(createdId);
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: false });
    expect(result.items.some((d) => d.id === createdId)).toBe(false);
  });

  it("visible with includeInactive=true", async () => {
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: true });
    expect(result.items.some((d) => d.id === createdId)).toBe(true);
  });
});
