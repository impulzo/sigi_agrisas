import { NextRequest } from "next/server";
import { BranchesController } from "@/modules/branches/infrastructure/http/BranchesController";
import { InMemoryBranchRepository } from "@/modules/branches/infrastructure/repositories/InMemoryBranchRepository";
import { ListBranchesUseCase } from "@/modules/branches/application/use-cases/ListBranchesUseCase";
import { GetBranchUseCase } from "@/modules/branches/application/use-cases/GetBranchUseCase";
import { CreateBranchUseCase } from "@/modules/branches/application/use-cases/CreateBranchUseCase";
import { UpdateBranchUseCase } from "@/modules/branches/application/use-cases/UpdateBranchUseCase";
import { SoftDeleteBranchUseCase } from "@/modules/branches/application/use-cases/SoftDeleteBranchUseCase";

function buildController(): { controller: BranchesController; repo: InMemoryBranchRepository } {
  const repo = new InMemoryBranchRepository();
  const controller = new BranchesController(
    new ListBranchesUseCase(repo),
    new GetBranchUseCase(repo),
    new CreateBranchUseCase(repo),
    new UpdateBranchUseCase(repo),
    new SoftDeleteBranchUseCase(repo)
  );
  return { controller, repo };
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/test", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("BranchesController — isHeadquarters", () => {
  it("crea con isHeadquarters: true cuando no hay otra HQ", async () => {
    const { controller } = buildController();
    const res = await controller.create(postReq({ code: "MATRIZ", name: "Matriz", isHeadquarters: true }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.isHeadquarters).toBe(true);
  });

  it("rechaza una segunda branch con isHeadquarters: true (409)", async () => {
    const { controller } = buildController();
    await controller.create(postReq({ code: "MATRIZ", name: "Matriz", isHeadquarters: true }));
    const res = await controller.create(postReq({ code: "SUC_2", name: "Sucursal 2", isHeadquarters: true }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/headquarters/i);
  });

  it("permite demote: PATCH isHeadquarters=false sobre la HQ actual", async () => {
    const { controller } = buildController();
    const created = await controller.create(postReq({ code: "MATRIZ", name: "Matriz", isHeadquarters: true }));
    const { id } = await created.json();
    const res = await controller.update(patchReq({ isHeadquarters: false }), id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isHeadquarters).toBe(false);
  });

  it("PATCH isHeadquarters=true falla con 409 cuando ya hay otra HQ", async () => {
    const { controller } = buildController();
    await controller.create(postReq({ code: "MATRIZ", name: "Matriz", isHeadquarters: true }));
    const created = await controller.create(postReq({ code: "SUC_2", name: "Sucursal 2" }));
    const { id } = await created.json();
    const res = await controller.update(patchReq({ isHeadquarters: true }), id);
    expect(res.status).toBe(409);
  });

  it("create sin isHeadquarters → default false", async () => {
    const { controller } = buildController();
    const res = await controller.create(postReq({ code: "SUC_1", name: "Sucursal" }));
    const body = await res.json();
    expect(body.isHeadquarters).toBe(false);
  });
});
