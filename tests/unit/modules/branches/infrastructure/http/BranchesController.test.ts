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

describe("BranchesController — domicilio fiscal estructurado", () => {
  it("crea con los 8 campos de domicilio estructurado, independientes de address", async () => {
    const { controller } = buildController();
    const res = await controller.create(
      postReq({
        code: "SUC_1",
        name: "Sucursal",
        address: "Texto libre existente",
        addressStreet: "Calle 1",
        addressExteriorNumber: "100",
        addressNeighborhood: "Centro",
        addressMunicipality: "Hermosillo",
        addressState: "SON",
        addressZipCode: "83000",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.address).toBe("Texto libre existente");
    expect(body.addressStreet).toBe("Calle 1");
    expect(body.addressZipCode).toBe("83000");
    expect(body.addressCountry).toBe("MEX");
  });

  it("PATCH solo addressZipCode → actualiza ese campo sin exigir los demás", async () => {
    const { controller } = buildController();
    const created = await controller.create(postReq({ code: "SUC_1", name: "Sucursal" }));
    const { id } = await created.json();
    const res = await controller.update(patchReq({ addressZipCode: "01000" }), id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.addressZipCode).toBe("01000");
    expect(body.addressStreet).toBeNull();
  });

  it("rechaza addressZipCode con formato inválido (400)", async () => {
    const { controller } = buildController();
    const res = await controller.create(postReq({ code: "SUC_1", name: "Sucursal", addressZipCode: "12" }));
    expect(res.status).toBe(400);
  });

  it("rechaza addressState con formato inválido (400)", async () => {
    const { controller } = buildController();
    const res = await controller.create(postReq({ code: "SUC_1", name: "Sucursal", addressState: "sonora" }));
    expect(res.status).toBe(400);
  });
});
