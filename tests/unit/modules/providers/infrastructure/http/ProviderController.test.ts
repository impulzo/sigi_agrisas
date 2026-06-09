import { NextRequest } from "next/server";
import { ProviderController } from "@/modules/providers/infrastructure/http/ProviderController";
import { InMemoryProviderRepository } from "@/modules/providers/infrastructure/repositories/InMemoryProviderRepository";
import { ListProvidersUseCase } from "@/modules/providers/application/use-cases/ListProvidersUseCase";
import { GetProviderUseCase } from "@/modules/providers/application/use-cases/GetProviderUseCase";
import { CreateProviderUseCase } from "@/modules/providers/application/use-cases/CreateProviderUseCase";
import { UpdateProviderUseCase } from "@/modules/providers/application/use-cases/UpdateProviderUseCase";
import { SoftDeleteProviderUseCase } from "@/modules/providers/application/use-cases/SoftDeleteProviderUseCase";

function buildController() {
  const repo = new InMemoryProviderRepository();
  (repo as any).reset?.();
  return new ProviderController(
    new ListProvidersUseCase(repo),
    new GetProviderUseCase(repo),
    new CreateProviderUseCase(repo),
    new UpdateProviderUseCase(repo),
    new SoftDeleteProviderUseCase(repo)
  );
}

function makeCreateReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/providers", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeUpdateReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/providers/00000000-0000-0000-0000-000000000001", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeListReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/v1/admin/providers");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

describe("ProviderController — Zod validation", () => {
  it("rejects invalid RFC format", async () => {
    const ctrl = buildController();
    const res = await ctrl.create(makeCreateReq({ code: "P001", name: "Test", rfc: "invalid-rfc" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/rfc/i);
  });

  it("normalizes RFC to uppercase", async () => {
    const ctrl = buildController();
    const res = await ctrl.create(makeCreateReq({ code: "P001", name: "Test", rfc: "xaxx010101000" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rfc).toBe("XAXX010101000");
  });

  it("normalizes code to uppercase", async () => {
    const ctrl = buildController();
    const res = await ctrl.create(makeCreateReq({ code: "prov001", name: "Test", rfc: "XAXX010101000" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("PROV001");
  });

  it("rejects invalid code format (lowercase letters)", async () => {
    const ctrl = buildController();
    const res = await ctrl.create(makeCreateReq({ code: "prov 001!", name: "Test", rfc: "XAXX010101000" }));
    expect(res.status).toBe(400);
  });

  it("rejects taxRegime not matching 3 digits", async () => {
    const ctrl = buildController();
    const res = await ctrl.create(makeCreateReq({ code: "P001", name: "Test", rfc: "XAXX010101000", taxRegime: "6012" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/taxRegime/i);
  });

  it("rejects cfdiUse with wrong format", async () => {
    const ctrl = buildController();
    const res = await ctrl.create(makeCreateReq({ code: "P001", name: "Test", rfc: "XAXX010101000", cfdiUse: "GX1" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cfdiUse/i);
  });

  it("rejects invalid email", async () => {
    const ctrl = buildController();
    const res = await ctrl.create(makeCreateReq({ code: "P001", name: "Test", rfc: "XAXX010101000", email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });

  it("rejects search query shorter than 2 characters", async () => {
    const ctrl = buildController();
    const res = await ctrl.list(makeListReq({ search: "a" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/search/i);
  });

  it("ignores search with only whitespace (treated as empty → no filter)", async () => {
    const ctrl = buildController();
    const res = await ctrl.list(makeListReq({ search: "   " }));
    expect(res.status).toBe(200);
  });

  it("rejects PATCH with empty body", async () => {
    const ctrl = buildController();
    const res = await ctrl.update(makeUpdateReq({}), "00000000-0000-0000-0000-000000000001");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least one field/i);
  });
});
