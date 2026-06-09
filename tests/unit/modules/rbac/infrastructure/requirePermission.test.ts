import { NextRequest } from "next/server";

jest.mock("@/modules/rbac/infrastructure/di/container", () => ({
  rbacContainer: { authorizationService: {} },
}));

import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

function makeAuthzService(can: boolean): AuthorizationService {
  return {
    userCan: jest.fn().mockResolvedValue(can),
    listUserPermissions: jest.fn(),
    invalidate: jest.fn(),
    invalidateByRole: jest.fn(),
  };
}

function makeReq(userId?: string) {
  const headers: Record<string, string> = {};
  if (userId) headers["x-user-id"] = userId;
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("requirePermission", () => {
  it("devuelve 401 si no hay x-user-id en el header", async () => {
    const result = await requirePermission(makeReq(), "users:read", makeAuthzService(true));
    expect(result?.status).toBe(401);
  });

  it("devuelve 403 si userCan devuelve false", async () => {
    const result = await requirePermission(makeReq("user-1"), "users:write", makeAuthzService(false));
    expect(result?.status).toBe(403);
    const body = await result!.json();
    expect(body.required).toBe("users:write");
  });

  it("devuelve null si el usuario tiene el permiso", async () => {
    const result = await requirePermission(makeReq("user-1"), "users:read", makeAuthzService(true));
    expect(result).toBeNull();
  });
});
