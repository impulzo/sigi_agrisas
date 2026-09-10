import { NextRequest } from "next/server";

const userCanMock = jest.fn();
const listUserPermissionsMock = jest.fn();

jest.mock("@/modules/rbac/infrastructure/di/container", () => ({
  rbacContainer: { authorizationService: { userCan: userCanMock } },
  rbacController: { listUserPermissions: listUserPermissionsMock },
}));

import { GET } from "../../../../app/api/v1/admin/users/[id]/permissions/route";

function makeReq(userId?: string) {
  const headers: Record<string, string> = {};
  if (userId) headers["x-user-id"] = userId;
  return new NextRequest("http://localhost/api/v1/admin/users/target/permissions", { headers });
}

beforeEach(() => {
  userCanMock.mockReset();
  listUserPermissionsMock.mockReset();
  listUserPermissionsMock.mockResolvedValue(
    new Response(JSON.stringify({ permissions: ["sales:read"] }), { status: 200 })
  );
});

describe("GET /api/v1/admin/users/:id/permissions — self-access", () => {
  it("permite a un usuario sin users:read consultar sus propios permisos (self-access)", async () => {
    const req = makeReq("user-1");
    const res = await GET(req, { params: { id: "user-1" } });

    expect(userCanMock).not.toHaveBeenCalled();
    expect(listUserPermissionsMock).toHaveBeenCalledWith(req, "user-1");
    expect(res.status).toBe(200);
  });

  it("exige users:read cuando el id consultado es de otro usuario", async () => {
    userCanMock.mockResolvedValue(false);
    const req = makeReq("user-1");
    const res = await GET(req, { params: { id: "user-2" } });

    expect(userCanMock).toHaveBeenCalledWith("user-1", "users:read");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.required).toBe("users:read");
    expect(listUserPermissionsMock).not.toHaveBeenCalled();
  });

  it("permite consultar los permisos de otro usuario cuando el caller tiene users:read", async () => {
    userCanMock.mockResolvedValue(true);
    const req = makeReq("user-1");
    const res = await GET(req, { params: { id: "user-2" } });

    expect(userCanMock).toHaveBeenCalledWith("user-1", "users:read");
    expect(listUserPermissionsMock).toHaveBeenCalledWith(req, "user-2");
    expect(res.status).toBe(200);
  });

  it("devuelve 401 si falta x-user-id incluso en el propio id de la URL", async () => {
    const req = makeReq(undefined);
    const res = await GET(req, { params: { id: "user-1" } });

    expect(res.status).toBe(401);
    expect(listUserPermissionsMock).not.toHaveBeenCalled();
  });
});
