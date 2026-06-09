import { listRoles } from "../../../../../app/(private)/roles/_logic/services/listRoles";
import { ForbiddenError, NetworkError } from "../../../../../app/_lib/authFetch";

function makeFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    clone: () => ({ json: () => Promise.resolve(body) }),
  }) as unknown as typeof fetch;
}

describe("listRoles service", () => {
  it("returns roles array on 200 OK", async () => {
    const roles = await listRoles(makeFetch(200, { roles: [{ id: "1", name: "admin", description: null, createdAt: "", updatedAt: "" }] }) as never);
    expect(roles).toHaveLength(1);
    expect(roles[0].name).toBe("admin");
  });

  it("throws ForbiddenError on 403", async () => {
    const fetchImpl = jest.fn().mockImplementationOnce(() => { throw new ForbiddenError("roles:read"); }) as unknown as typeof fetch;
    await expect(listRoles(fetchImpl as never)).rejects.toThrow(ForbiddenError);
  });

  it("throws NetworkError on 500", async () => {
    await expect(listRoles(makeFetch(500, {}) as never)).rejects.toThrow(NetworkError);
  });
});
