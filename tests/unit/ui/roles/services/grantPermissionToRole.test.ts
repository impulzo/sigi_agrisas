import { grantPermissionToRole } from "../../../../../app/(private)/roles/_logic/services/grantPermissionToRole";
import {
  RoleNotFoundError,
  PermissionNotFoundError,
  PermissionAlreadyGrantedError,
  ValidationError,
} from "../../../../../app/(private)/roles/_logic/types/domain";
import { NetworkError } from "../../../../../app/_lib/authFetch";

function makeFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    clone: () => ({ json: () => Promise.resolve(body) }),
  }) as unknown as typeof fetch;
}

describe("grantPermissionToRole service", () => {
  it("resolves successfully on 200 OK", async () => {
    await expect(grantPermissionToRole("role-1", "users:read", makeFetch(200, {}) as never)).resolves.toBeUndefined();
  });

  it("throws PermissionAlreadyGrantedError on 409", async () => {
    await expect(grantPermissionToRole("role-1", "users:read", makeFetch(409, {}) as never)).rejects.toThrow(PermissionAlreadyGrantedError);
  });

  it("throws ValidationError on 400", async () => {
    await expect(grantPermissionToRole("role-1", "bad", makeFetch(400, { error: "invalid" }) as never)).rejects.toThrow(ValidationError);
  });

  it("throws RoleNotFoundError on 404 when body.error references role", async () => {
    await expect(grantPermissionToRole("role-1", "users:read", makeFetch(404, { error: "Role not found" }) as never)).rejects.toThrow(RoleNotFoundError);
  });

  it("throws PermissionNotFoundError on 404 when body.error references permission", async () => {
    await expect(grantPermissionToRole("role-1", "users:read", makeFetch(404, { error: "Permission not found" }) as never)).rejects.toThrow(PermissionNotFoundError);
  });

  it("throws NetworkError on 500", async () => {
    await expect(grantPermissionToRole("role-1", "users:read", makeFetch(500, {}) as never)).rejects.toThrow(NetworkError);
  });
});
