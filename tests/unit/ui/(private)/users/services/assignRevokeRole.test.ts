import { assignRoleToUser } from "../../../../../../app/(private)/users/_logic/services/assignRoleToUser";
import { revokeRoleFromUser } from "../../../../../../app/(private)/users/_logic/services/revokeRoleFromUser";
import { NetworkError } from "../../../../../../app/_lib/authFetch";
import { UserNotFoundError } from "../../../../../../app/(private)/users/_logic/errors";

function makeFetch(status: number): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
  } as Response);
}

describe("assignRoleToUser", () => {
  it("resuelve en éxito (201)", async () => {
    await expect(assignRoleToUser("u1", "admin", makeFetch(201))).resolves.toBeUndefined();
  });

  it("mapea 404 a UserNotFoundError", async () => {
    await expect(assignRoleToUser("u1", "admin", makeFetch(404))).rejects.toThrow(UserNotFoundError);
  });

  it("lanza NetworkError en error genérico", async () => {
    const f = jest.fn().mockRejectedValue(new NetworkError());
    await expect(assignRoleToUser("u1", "admin", f as typeof fetch)).rejects.toThrow(NetworkError);
  });
});

describe("revokeRoleFromUser", () => {
  it("resuelve en éxito (204)", async () => {
    await expect(revokeRoleFromUser("u1", "role-id", makeFetch(204))).resolves.toBeUndefined();
  });

  it("mapea 404 a UserNotFoundError", async () => {
    await expect(revokeRoleFromUser("u1", "role-id", makeFetch(404))).rejects.toThrow(UserNotFoundError);
  });

  it("lanza NetworkError en error genérico", async () => {
    const f = jest.fn().mockRejectedValue(new Error("net"));
    await expect(revokeRoleFromUser("u1", "role-id", f as typeof fetch)).rejects.toThrow(NetworkError);
  });
});
