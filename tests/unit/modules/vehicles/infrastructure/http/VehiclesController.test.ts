import { NextRequest } from "next/server";
import { VehiclesController } from "@/modules/vehicles/infrastructure/http/VehiclesController";
import { InMemoryVehicleRepository } from "@/modules/vehicles/infrastructure/repositories/InMemoryVehicleRepository";
import { ListVehiclesUseCase } from "@/modules/vehicles/application/use-cases/ListVehiclesUseCase";
import { GetVehicleUseCase } from "@/modules/vehicles/application/use-cases/GetVehicleUseCase";
import { CreateVehicleUseCase } from "@/modules/vehicles/application/use-cases/CreateVehicleUseCase";
import { UpdateVehicleUseCase } from "@/modules/vehicles/application/use-cases/UpdateVehicleUseCase";

const VALID_BODY = {
  code: "unit_001",
  plate: "ABC-1234",
  vehicleConfig: "C2",
  permitType: "TPAF01",
  permitNumber: "123456",
  insuranceCompany: "GNP",
  insurancePolicy: "POL-9988",
};

function buildController() {
  const repo = new InMemoryVehicleRepository();
  const ctrl = new VehiclesController(
    new ListVehiclesUseCase(repo),
    new GetVehicleUseCase(repo),
    new CreateVehicleUseCase(repo),
    new UpdateVehicleUseCase(repo)
  );
  return { ctrl, repo };
}

function makeCreateReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/vehicles", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeUpdateReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/vehicles/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeListReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/v1/admin/vehicles");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

describe("VehiclesController — create", () => {
  it("creates a vehicle with defaults notes:null isActive:true, code trimmed+uppercased", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.create(makeCreateReq(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("UNIT_001");
    expect(body.notes).toBeNull();
    expect(body.isActive).toBe(true);
  });

  it("rejects missing required field (plate) → 400", async () => {
    const { ctrl } = buildController();
    const { plate: _plate, ...rest } = VALID_BODY;
    const res = await ctrl.create(makeCreateReq(rest));
    expect(res.status).toBe(400);
  });

  it("rejects invalid code format → 400", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.create(makeCreateReq({ ...VALID_BODY, code: "bad code!" }));
    expect(res.status).toBe(400);
  });

  it("duplicate code → 409", async () => {
    const { ctrl } = buildController();
    const res1 = await ctrl.create(makeCreateReq(VALID_BODY));
    expect(res1.status).toBe(201);
    const res2 = await ctrl.create(makeCreateReq({ ...VALID_BODY, plate: "XYZ-0000" }));
    expect(res2.status).toBe(409);
  });
});

describe("VehiclesController — list", () => {
  it("returns only active vehicles by default", async () => {
    const { ctrl, repo } = buildController();
    const created = await repo.create(VALID_BODY);
    await repo.update(created.id, { isActive: false });
    const res = await ctrl.list(makeListReq());
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });

  it("includeInactive=true includes inactive vehicles", async () => {
    const { ctrl, repo } = buildController();
    const created = await repo.create(VALID_BODY);
    await repo.update(created.id, { isActive: false });
    const res = await ctrl.list(makeListReq({ includeInactive: "true" }));
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });

  it("rejects search shorter than 2 characters → 400", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.list(makeListReq({ search: "a" }));
    expect(res.status).toBe(400);
  });

  it("rejects pageSize over 100 → 400", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.list(makeListReq({ pageSize: "200" }));
    expect(res.status).toBe(400);
  });
});

describe("VehiclesController — getById", () => {
  it("invalid UUID → 400", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.getById(makeListReq(), "not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("not found → 404", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.getById(makeListReq(), "00000000-0000-0000-0000-000000000001");
    expect(res.status).toBe(404);
  });

  it("found → 200 with full DTO", async () => {
    const { ctrl, repo } = buildController();
    const created = await repo.create(VALID_BODY);
    const res = await ctrl.getById(makeListReq(), created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plate).toBe(VALID_BODY.plate);
  });
});

describe("VehiclesController — update / soft delete / reactivate", () => {
  it("rejects empty body → 400", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.update(makeUpdateReq({}), "00000000-0000-0000-0000-000000000001");
    expect(res.status).toBe(400);
  });

  it("code in body is ignored — updates only the other field", async () => {
    const { ctrl, repo } = buildController();
    const created = await repo.create(VALID_BODY);
    const res = await ctrl.update(makeUpdateReq({ code: "NEW", insuranceCompany: "AXA" }), created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(created.code);
    expect(body.insuranceCompany).toBe("AXA");
  });

  it("not found → 404", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.update(
      makeUpdateReq({ insuranceCompany: "AXA" }),
      "00000000-0000-0000-0000-000000000001"
    );
    expect(res.status).toBe(404);
  });

  it("soft delete via PATCH {isActive:false} then reactivate via PATCH {isActive:true} — no DELETE endpoint", async () => {
    const { ctrl, repo } = buildController();
    const created = await repo.create(VALID_BODY);
    expect((ctrl as unknown as { softDelete?: unknown }).softDelete).toBeUndefined();

    const del = await ctrl.update(makeUpdateReq({ isActive: false }), created.id);
    expect(del.status).toBe(200);
    expect((await del.json()).isActive).toBe(false);

    const listRes = await ctrl.list(makeListReq());
    expect((await listRes.json()).items).toHaveLength(0);

    const react = await ctrl.update(makeUpdateReq({ isActive: true }), created.id);
    expect(react.status).toBe(200);
    expect((await react.json()).isActive).toBe(true);
  });
});
