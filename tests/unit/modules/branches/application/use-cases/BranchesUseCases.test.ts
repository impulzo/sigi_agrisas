import { InMemoryBranchRepository } from "@/modules/branches/infrastructure/repositories/InMemoryBranchRepository";
import { ListBranchesUseCase } from "@/modules/branches/application/use-cases/ListBranchesUseCase";
import { GetBranchUseCase } from "@/modules/branches/application/use-cases/GetBranchUseCase";
import { CreateBranchUseCase } from "@/modules/branches/application/use-cases/CreateBranchUseCase";
import { UpdateBranchUseCase } from "@/modules/branches/application/use-cases/UpdateBranchUseCase";
import { SoftDeleteBranchUseCase } from "@/modules/branches/application/use-cases/SoftDeleteBranchUseCase";
import { Branch } from "@/modules/branches/domain/entities/Branch";
import { BranchNotFoundError } from "@/modules/branches/domain/errors/BranchNotFoundError";
import { BranchCodeAlreadyInUseError } from "@/modules/branches/domain/errors/BranchCodeAlreadyInUseError";

function makeBranch(id: string, code: string, isActive = true): Branch {
  const now = new Date();
  return Branch.create(id, { code, name: `Branch ${code}`, address: null, phone: null, email: null, isHeadquarters: false, isActive, createdAt: now, updatedAt: now });
}

describe("ListBranchesUseCase", () => {
  it("returns only active by default", async () => {
    const repo = new InMemoryBranchRepository();
    repo.seed([makeBranch("1", "HQ", true), makeBranch("2", "SUC_N", false)]);
    const result = await new ListBranchesUseCase(repo).execute({ page: 1, pageSize: 20, includeInactive: false });
    expect(result.items).toHaveLength(1);
  });

  it("includes inactive when requested", async () => {
    const repo = new InMemoryBranchRepository();
    repo.seed([makeBranch("1", "HQ", true), makeBranch("2", "SUC_N", false)]);
    const result = await new ListBranchesUseCase(repo).execute({ page: 1, pageSize: 20, includeInactive: true });
    expect(result.items).toHaveLength(2);
  });
});

describe("GetBranchUseCase", () => {
  it("returns branch by id", async () => {
    const repo = new InMemoryBranchRepository();
    repo.seed([makeBranch("abc", "HQ")]);
    expect((await new GetBranchUseCase(repo).execute("abc")).code).toBe("HQ");
  });

  it("throws BranchNotFoundError when not found", async () => {
    await expect(new GetBranchUseCase(new InMemoryBranchRepository()).execute("x")).rejects.toThrow(BranchNotFoundError);
  });
});

describe("CreateBranchUseCase", () => {
  it("creates with minimal data", async () => {
    const result = await new CreateBranchUseCase(new InMemoryBranchRepository()).execute({ code: "HQ", name: "Matriz" });
    expect(result.address).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.isActive).toBe(true);
  });

  it("creates with all contact fields", async () => {
    const result = await new CreateBranchUseCase(new InMemoryBranchRepository()).execute({
      code: "SUC_N", name: "Norte", address: "Av. Reforma 100", phone: "+52 555 1234", email: "norte@agrisas.com",
    });
    expect(result.email).toBe("norte@agrisas.com");
    expect(result.address).toBe("Av. Reforma 100");
  });

  it("throws BranchCodeAlreadyInUseError on duplicate", async () => {
    const repo = new InMemoryBranchRepository();
    await new CreateBranchUseCase(repo).execute({ code: "HQ", name: "Matriz" });
    await expect(new CreateBranchUseCase(repo).execute({ code: "HQ", name: "Otro" })).rejects.toThrow(BranchCodeAlreadyInUseError);
  });
});

describe("UpdateBranchUseCase", () => {
  it("updates address", async () => {
    const repo = new InMemoryBranchRepository();
    const created = await new CreateBranchUseCase(repo).execute({ code: "HQ", name: "Matriz" });
    const result = await new UpdateBranchUseCase(repo).execute({ id: created.id, address: "Nueva Dir 200" });
    expect(result.address).toBe("Nueva Dir 200");
    expect(result.code).toBe("HQ");
  });

  it("clears email with null", async () => {
    const repo = new InMemoryBranchRepository();
    const created = await new CreateBranchUseCase(repo).execute({ code: "HQ", name: "Matriz", email: "hq@test.com" });
    const result = await new UpdateBranchUseCase(repo).execute({ id: created.id, email: null });
    expect(result.email).toBeNull();
  });

  it("throws BranchNotFoundError for unknown id", async () => {
    await expect(new UpdateBranchUseCase(new InMemoryBranchRepository()).execute({ id: "x", name: "N" })).rejects.toThrow(BranchNotFoundError);
  });
});

describe("SoftDeleteBranchUseCase", () => {
  it("marks branch as inactive", async () => {
    const repo = new InMemoryBranchRepository();
    const created = await new CreateBranchUseCase(repo).execute({ code: "HQ", name: "Matriz" });
    await new SoftDeleteBranchUseCase(repo).execute(created.id);
    expect((await new GetBranchUseCase(repo).execute(created.id)).isActive).toBe(false);
  });

  it("is idempotent", async () => {
    const repo = new InMemoryBranchRepository();
    const created = await new CreateBranchUseCase(repo).execute({ code: "HQ", name: "Matriz", isActive: false });
    await expect(new SoftDeleteBranchUseCase(repo).execute(created.id)).resolves.toBeUndefined();
  });

  it("throws BranchNotFoundError for unknown id", async () => {
    await expect(new SoftDeleteBranchUseCase(new InMemoryBranchRepository()).execute("ghost")).rejects.toThrow(BranchNotFoundError);
  });
});
