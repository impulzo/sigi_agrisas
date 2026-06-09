import { NextRequest } from "next/server";
import {
  enforceBranchScope,
  resolveScopedBranchId,
} from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

function makeReq(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/test", { headers });
}

function makeAuthz(canResult: boolean): AuthorizationService {
  return {
    userCan: jest.fn().mockResolvedValue(canResult),
    listUserPermissions: jest.fn().mockResolvedValue([]),
    invalidate: jest.fn(),
    invalidateByRole: jest.fn().mockResolvedValue(undefined),
  };
}

describe("enforceBranchScope", () => {
  it("retorna 401 si no hay x-user-id", async () => {
    const res = await enforceBranchScope(makeReq({}), "b1", makeAuthz(false));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it("retorna null cuando el usuario tiene branches:access_all (bypass)", async () => {
    const res = await enforceBranchScope(
      makeReq({ "x-user-id": "u1", "x-user-branch-id": "" }),
      "b2",
      makeAuthz(true)
    );
    expect(res).toBeNull();
  });

  it("retorna null cuando x-user-branch-id coincide con resourceBranchId", async () => {
    const res = await enforceBranchScope(
      makeReq({ "x-user-id": "u1", "x-user-branch-id": "b1" }),
      "b1",
      makeAuthz(false)
    );
    expect(res).toBeNull();
  });

  it("retorna 403 cuando branchId difiere y no hay bypass", async () => {
    const res = await enforceBranchScope(
      makeReq({ "x-user-id": "u1", "x-user-branch-id": "b1" }),
      "b2",
      makeAuthz(false)
    );
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.required).toBe("branches:access_all");
  });

  it("retorna 403 cuando x-user-branch-id está vacío y no hay bypass", async () => {
    const res = await enforceBranchScope(
      makeReq({ "x-user-id": "u1", "x-user-branch-id": "" }),
      "b1",
      makeAuthz(false)
    );
    expect(res!.status).toBe(403);
  });
});

describe("resolveScopedBranchId", () => {
  it("retorna el branchId solicitado cuando el usuario tiene bypass", async () => {
    const r = await resolveScopedBranchId(
      makeReq({ "x-user-id": "u1", "x-user-branch-id": "" }),
      "b2",
      makeAuthz(true)
    );
    expect(r).toEqual({ branchId: "b2" });
  });

  it("retorna undefined (listar todas) cuando bypass + sin branchId solicitado", async () => {
    const r = await resolveScopedBranchId(
      makeReq({ "x-user-id": "u1", "x-user-branch-id": "" }),
      undefined,
      makeAuthz(true)
    );
    expect(r).toEqual({ branchId: undefined });
  });

  it("aplica scope implícito al x-user-branch-id cuando no hay bypass ni branchId pedido", async () => {
    const r = await resolveScopedBranchId(
      makeReq({ "x-user-id": "u1", "x-user-branch-id": "b1" }),
      undefined,
      makeAuthz(false)
    );
    expect(r).toEqual({ branchId: "b1" });
  });

  it("retorna 403 si pide otro branchId sin bypass", async () => {
    const r = await resolveScopedBranchId(
      makeReq({ "x-user-id": "u1", "x-user-branch-id": "b1" }),
      "b2",
      makeAuthz(false)
    );
    expect("status" in r).toBe(true);
    expect((r as Response).status).toBe(403);
  });

  it("retorna 403 si no tiene branch asignada ni bypass", async () => {
    const r = await resolveScopedBranchId(
      makeReq({ "x-user-id": "u1", "x-user-branch-id": "" }),
      undefined,
      makeAuthz(false)
    );
    expect("status" in r).toBe(true);
    expect((r as Response).status).toBe(403);
  });

  it("retorna 401 si no hay x-user-id", async () => {
    const r = await resolveScopedBranchId(makeReq({}), undefined, makeAuthz(false));
    expect("status" in r).toBe(true);
    expect((r as Response).status).toBe(401);
  });
});
