import { InMemoryFolioRepository } from "@/modules/folios/infrastructure/repositories/InMemoryFolioRepository";
import { ListFoliosUseCase } from "@/modules/folios/application/use-cases/ListFoliosUseCase";
import { GetFolioUseCase } from "@/modules/folios/application/use-cases/GetFolioUseCase";
import { CreateFolioUseCase } from "@/modules/folios/application/use-cases/CreateFolioUseCase";
import { UpdateFolioUseCase } from "@/modules/folios/application/use-cases/UpdateFolioUseCase";
import { SoftDeleteFolioUseCase } from "@/modules/folios/application/use-cases/SoftDeleteFolioUseCase";
import { Folio } from "@/modules/folios/domain/entities/Folio";
import { FolioNotFoundError } from "@/modules/folios/domain/errors/FolioNotFoundError";
import { FolioCodeAlreadyInUseError } from "@/modules/folios/domain/errors/FolioCodeAlreadyInUseError";

function makeFolio(id: string, code: string, isActive = true): Folio {
  const now = new Date();
  return Folio.create(id, { code, name: `Folio ${code}`, prefix: null, currentNumber: 0, isActive, createdAt: now, updatedAt: now });
}

describe("ListFoliosUseCase", () => {
  it("returns only active by default", async () => {
    const repo = new InMemoryFolioRepository();
    repo.seed([makeFolio("1", "A", true), makeFolio("2", "B", false)]);
    const result = await new ListFoliosUseCase(repo).execute({ page: 1, pageSize: 20, includeInactive: false });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].code).toBe("A");
  });

  it("includes inactive when requested", async () => {
    const repo = new InMemoryFolioRepository();
    repo.seed([makeFolio("1", "A", true), makeFolio("2", "B", false)]);
    const result = await new ListFoliosUseCase(repo).execute({ page: 1, pageSize: 20, includeInactive: true });
    expect(result.items).toHaveLength(2);
  });
});

describe("GetFolioUseCase", () => {
  it("returns a folio by id", async () => {
    const repo = new InMemoryFolioRepository();
    repo.seed([makeFolio("abc", "FAC_A")]);
    const result = await new GetFolioUseCase(repo).execute("abc");
    expect(result.code).toBe("FAC_A");
  });

  it("throws FolioNotFoundError when not found", async () => {
    await expect(new GetFolioUseCase(new InMemoryFolioRepository()).execute("x")).rejects.toThrow(FolioNotFoundError);
  });
});

describe("CreateFolioUseCase", () => {
  it("creates with defaults", async () => {
    const result = await new CreateFolioUseCase(new InMemoryFolioRepository()).execute({ code: "FAC_A", name: "Facturas A" });
    expect(result.prefix).toBeNull();
    expect(result.currentNumber).toBe(0);
    expect(result.isActive).toBe(true);
  });

  it("creates with prefix and currentNumber", async () => {
    const result = await new CreateFolioUseCase(new InMemoryFolioRepository()).execute({ code: "REC_1", name: "Recibos", prefix: "REC-", currentNumber: 1000 });
    expect(result.prefix).toBe("REC-");
    expect(result.currentNumber).toBe(1000);
  });

  it("throws FolioCodeAlreadyInUseError on duplicate", async () => {
    const repo = new InMemoryFolioRepository();
    await new CreateFolioUseCase(repo).execute({ code: "FAC_A", name: "Facturas" });
    await expect(new CreateFolioUseCase(repo).execute({ code: "FAC_A", name: "Otro" })).rejects.toThrow(FolioCodeAlreadyInUseError);
  });
});

describe("UpdateFolioUseCase", () => {
  it("updates currentNumber", async () => {
    const repo = new InMemoryFolioRepository();
    const created = await new CreateFolioUseCase(repo).execute({ code: "FAC_A", name: "Facturas" });
    const result = await new UpdateFolioUseCase(repo).execute({ id: created.id, currentNumber: 5000 });
    expect(result.currentNumber).toBe(5000);
  });

  it("clears prefix with null", async () => {
    const repo = new InMemoryFolioRepository();
    const created = await new CreateFolioUseCase(repo).execute({ code: "FAC_A", name: "Facturas", prefix: "FAC-" });
    const result = await new UpdateFolioUseCase(repo).execute({ id: created.id, prefix: null });
    expect(result.prefix).toBeNull();
  });

  it("code stays unchanged on update", async () => {
    const repo = new InMemoryFolioRepository();
    const created = await new CreateFolioUseCase(repo).execute({ code: "FAC_A", name: "Facturas" });
    const result = await new UpdateFolioUseCase(repo).execute({ id: created.id, name: "Otro" });
    expect(result.code).toBe("FAC_A");
  });

  it("throws FolioNotFoundError for unknown id", async () => {
    await expect(new UpdateFolioUseCase(new InMemoryFolioRepository()).execute({ id: "x", name: "N" })).rejects.toThrow(FolioNotFoundError);
  });
});

describe("SoftDeleteFolioUseCase", () => {
  it("marks folio as inactive", async () => {
    const repo = new InMemoryFolioRepository();
    const created = await new CreateFolioUseCase(repo).execute({ code: "FAC_A", name: "Facturas" });
    await new SoftDeleteFolioUseCase(repo).execute(created.id);
    const found = await new GetFolioUseCase(repo).execute(created.id);
    expect(found.isActive).toBe(false);
  });

  it("is idempotent on inactive folio", async () => {
    const repo = new InMemoryFolioRepository();
    const created = await new CreateFolioUseCase(repo).execute({ code: "FAC_A", name: "Facturas", isActive: false });
    await expect(new SoftDeleteFolioUseCase(repo).execute(created.id)).resolves.toBeUndefined();
  });

  it("throws FolioNotFoundError for unknown id", async () => {
    await expect(new SoftDeleteFolioUseCase(new InMemoryFolioRepository()).execute("ghost")).rejects.toThrow(FolioNotFoundError);
  });
});
