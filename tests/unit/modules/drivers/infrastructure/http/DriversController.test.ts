import { NextRequest } from "next/server";
import { DriversController } from "@/modules/drivers/infrastructure/http/DriversController";
import { InMemoryDriverRepository } from "@/modules/drivers/infrastructure/repositories/InMemoryDriverRepository";
import { ListDriversUseCase } from "@/modules/drivers/application/use-cases/ListDriversUseCase";
import { GetDriverUseCase } from "@/modules/drivers/application/use-cases/GetDriverUseCase";
import { CreateDriverUseCase } from "@/modules/drivers/application/use-cases/CreateDriverUseCase";
import { UpdateDriverUseCase } from "@/modules/drivers/application/use-cases/UpdateDriverUseCase";

const VALID_BODY = {
  code: "op_001",
  name: "Juan Pérez",
  licenseNumber: "LIC-99887",
};

function buildController() {
  const repo = new InMemoryDriverRepository();
  const ctrl = new DriversController(
    new ListDriversUseCase(repo),
    new GetDriverUseCase(repo),
    new CreateDriverUseCase(repo),
    new UpdateDriverUseCase(repo)
  );
  return { ctrl, repo };
}

function makeCreateReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/drivers", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeUpdateReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/drivers/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeListReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/v1/admin/drivers");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

describe("DriversController — create", () => {
  it("creates without rfc → 201 with rfc:null, notes:null, isActive:true", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.create(makeCreateReq(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("OP_001");
    expect(body.rfc).toBeNull();
    expect(body.notes).toBeNull();
    expect(body.isActive).toBe(true);
  });

  it("creates with a valid rfc → uppercased", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.create(makeCreateReq({ ...VALID_BODY, rfc: "xaxx010101000" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rfc).toBe("XAXX010101000");
  });

  it("rejects invalid rfc format → 400", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.create(makeCreateReq({ ...VALID_BODY, rfc: "XXX" }));
    expect(res.status).toBe(400);
  });

  it("two drivers without rfc coexist without 409 (no uniqueness constraint on rfc)", async () => {
    const { ctrl } = buildController();
    const res1 = await ctrl.create(makeCreateReq({ code: "OP_001", name: "A", licenseNumber: "L1" }));
    const res2 = await ctrl.create(makeCreateReq({ code: "OP_002", name: "B", licenseNumber: "L2" }));
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });

  it("duplicate code → 409", async () => {
    const { ctrl } = buildController();
    const res1 = await ctrl.create(makeCreateReq(VALID_BODY));
    expect(res1.status).toBe(201);
    const res2 = await ctrl.create(makeCreateReq({ ...VALID_BODY, licenseNumber: "LIC-2" }));
    expect(res2.status).toBe(409);
  });
});

describe("DriversController — list", () => {
  it("rejects pageSize over 100 → 400", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.list(makeListReq({ pageSize: "200" }));
    expect(res.status).toBe(400);
  });

  it("rejects search shorter than 2 characters → 400", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.list(makeListReq({ search: "a" }));
    expect(res.status).toBe(400);
  });

  it("returns only active drivers by default, includeInactive=true includes them", async () => {
    const { ctrl, repo } = buildController();
    const created = await repo.create(VALID_BODY);
    await repo.update(created.id, { isActive: false });

    const activeOnly = await ctrl.list(makeListReq());
    expect((await activeOnly.json()).items).toHaveLength(0);

    const withInactive = await ctrl.list(makeListReq({ includeInactive: "true" }));
    expect((await withInactive.json()).items).toHaveLength(1);
  });
});

describe("DriversController — update / soft delete / reactivate", () => {
  it("rejects empty body → 400", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.update(makeUpdateReq({}), "00000000-0000-0000-0000-000000000001");
    expect(res.status).toBe(400);
  });

  it("code in body is ignored — updates only the other field", async () => {
    const { ctrl, repo } = buildController();
    const created = await repo.create(VALID_BODY);
    const res = await ctrl.update(makeUpdateReq({ code: "NEW", licenseNumber: "LIC-00001" }), created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(created.code);
    expect(body.licenseNumber).toBe("LIC-00001");
  });

  it("clears rfc via PATCH {rfc:null}", async () => {
    const { ctrl, repo } = buildController();
    const created = await repo.create({ ...VALID_BODY, rfc: "XAXX010101000" });
    const res = await ctrl.update(makeUpdateReq({ rfc: null }), created.id);
    expect(res.status).toBe(200);
    expect((await res.json()).rfc).toBeNull();
  });

  it("not found → 404", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.update(makeUpdateReq({ name: "Otro" }), "00000000-0000-0000-0000-000000000001");
    expect(res.status).toBe(404);
  });

  it("soft delete via PATCH {isActive:false} then reactivate via PATCH {isActive:true} — no DELETE endpoint", async () => {
    const { ctrl, repo } = buildController();
    const created = await repo.create(VALID_BODY);
    expect((ctrl as unknown as { softDelete?: unknown }).softDelete).toBeUndefined();

    const del = await ctrl.update(makeUpdateReq({ isActive: false }), created.id);
    expect(del.status).toBe(200);
    expect((await del.json()).isActive).toBe(false);

    const react = await ctrl.update(makeUpdateReq({ isActive: true }), created.id);
    expect(react.status).toBe(200);
    expect((await react.json()).isActive).toBe(true);
  });
});
