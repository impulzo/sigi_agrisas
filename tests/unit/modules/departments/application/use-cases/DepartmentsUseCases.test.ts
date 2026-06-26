import { InMemoryDepartmentRepository } from "@/modules/departments/infrastructure/repositories/InMemoryDepartmentRepository";
import { InMemoryProviderRepository } from "@/modules/providers/infrastructure/repositories/InMemoryProviderRepository";
import { ListDepartmentsUseCase } from "@/modules/departments/application/use-cases/ListDepartmentsUseCase";
import { GetDepartmentUseCase } from "@/modules/departments/application/use-cases/GetDepartmentUseCase";
import { CreateDepartmentUseCase } from "@/modules/departments/application/use-cases/CreateDepartmentUseCase";
import { UpdateDepartmentUseCase } from "@/modules/departments/application/use-cases/UpdateDepartmentUseCase";
import { SoftDeleteDepartmentUseCase } from "@/modules/departments/application/use-cases/SoftDeleteDepartmentUseCase";
import { Department } from "@/modules/departments/domain/entities/Department";
import { DepartmentNotFoundError } from "@/modules/departments/domain/errors/DepartmentNotFoundError";
import { DepartmentCodeAlreadyInUseError } from "@/modules/departments/domain/errors/DepartmentCodeAlreadyInUseError";

const providerRepo = new InMemoryProviderRepository();

function makeDept(id: string, code: string, isActive = true): Department {
  const now = new Date();
  return Department.create(id, { code, name: `Dept ${code}`, description: null, providerId: null, providerName: null, isActive, createdAt: now, updatedAt: now });
}

describe("ListDepartmentsUseCase", () => {
  it("returns only active by default", async () => {
    const repo = new InMemoryDepartmentRepository();
    repo.seed([makeDept("1", "SALES", true), makeDept("2", "OPS", false)]);
    const result = await new ListDepartmentsUseCase(repo).execute({ page: 1, pageSize: 20, includeInactive: false });
    expect(result.items).toHaveLength(1);
  });

  it("includes inactive when requested", async () => {
    const repo = new InMemoryDepartmentRepository();
    repo.seed([makeDept("1", "SALES", true), makeDept("2", "OPS", false)]);
    const result = await new ListDepartmentsUseCase(repo).execute({ page: 1, pageSize: 20, includeInactive: true });
    expect(result.items).toHaveLength(2);
  });
});

describe("GetDepartmentUseCase", () => {
  it("returns dept by id", async () => {
    const repo = new InMemoryDepartmentRepository();
    repo.seed([makeDept("abc", "SALES")]);
    expect((await new GetDepartmentUseCase(repo).execute("abc")).code).toBe("SALES");
  });

  it("throws DepartmentNotFoundError when not found", async () => {
    await expect(new GetDepartmentUseCase(new InMemoryDepartmentRepository()).execute("x")).rejects.toThrow(DepartmentNotFoundError);
  });
});

describe("CreateDepartmentUseCase", () => {
  it("creates with minimal data", async () => {
    const result = await new CreateDepartmentUseCase(new InMemoryDepartmentRepository(), providerRepo).execute({ code: "SALES", name: "Ventas" });
    expect(result.isActive).toBe(true);
    expect(result.description).toBeNull();
  });

  it("throws DepartmentCodeAlreadyInUseError on duplicate", async () => {
    const repo = new InMemoryDepartmentRepository();
    await new CreateDepartmentUseCase(repo, providerRepo).execute({ code: "SALES", name: "Ventas" });
    await expect(new CreateDepartmentUseCase(repo, providerRepo).execute({ code: "SALES", name: "Otro" })).rejects.toThrow(DepartmentCodeAlreadyInUseError);
  });
});

describe("UpdateDepartmentUseCase", () => {
  it("updates name", async () => {
    const repo = new InMemoryDepartmentRepository();
    const created = await new CreateDepartmentUseCase(repo, providerRepo).execute({ code: "SALES", name: "Ventas" });
    const result = await new UpdateDepartmentUseCase(repo, providerRepo).execute({ id: created.id, name: "Ventas Corp." });
    expect(result.name).toBe("Ventas Corp.");
    expect(result.code).toBe("SALES");
  });

  it("clears description with null", async () => {
    const repo = new InMemoryDepartmentRepository();
    const created = await new CreateDepartmentUseCase(repo, providerRepo).execute({ code: "OPS", name: "Ops", description: "Desc" });
    const result = await new UpdateDepartmentUseCase(repo, providerRepo).execute({ id: created.id, description: null });
    expect(result.description).toBeNull();
  });

  it("throws DepartmentNotFoundError for unknown id", async () => {
    await expect(new UpdateDepartmentUseCase(new InMemoryDepartmentRepository(), providerRepo).execute({ id: "x", name: "N" })).rejects.toThrow(DepartmentNotFoundError);
  });
});

describe("SoftDeleteDepartmentUseCase", () => {
  it("marks department as inactive", async () => {
    const repo = new InMemoryDepartmentRepository();
    const created = await new CreateDepartmentUseCase(repo, providerRepo).execute({ code: "SALES", name: "Ventas" });
    await new SoftDeleteDepartmentUseCase(repo).execute(created.id);
    expect((await new GetDepartmentUseCase(repo).execute(created.id)).isActive).toBe(false);
  });

  it("is idempotent", async () => {
    const repo = new InMemoryDepartmentRepository();
    const created = await new CreateDepartmentUseCase(repo, providerRepo).execute({ code: "SALES", name: "Ventas", isActive: false });
    await expect(new SoftDeleteDepartmentUseCase(repo).execute(created.id)).resolves.toBeUndefined();
  });

  it("throws DepartmentNotFoundError for unknown id", async () => {
    await expect(new SoftDeleteDepartmentUseCase(new InMemoryDepartmentRepository()).execute("ghost")).rejects.toThrow(DepartmentNotFoundError);
  });
});
