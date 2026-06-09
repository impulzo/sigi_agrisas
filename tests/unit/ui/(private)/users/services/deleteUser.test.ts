import { deleteUser } from "../../../../../../app/(private)/users/_logic/services/deleteUser";
import { NetworkError, ForbiddenError } from "../../../../../../app/_lib/authFetch";
import { UserNotFoundError, SelfModificationError } from "../../../../../../app/(private)/users/_logic/errors";

function makeFetch(status: number, body?: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body ?? {}),
  } as Response);
}

describe("deleteUser", () => {
  it("retorna void para 204", async () => {
    await expect(deleteUser("u1", makeFetch(204))).resolves.toBeUndefined();
  });

  it("mapea 404 a UserNotFoundError", async () => {
    await expect(deleteUser("u1", makeFetch(404, { error: "User not found" }))).rejects.toThrow(UserNotFoundError);
  });

  it("mapea ForbiddenError sin required a SelfModificationError delete", async () => {
    const f = jest.fn().mockRejectedValue(new ForbiddenError());
    const err = await deleteUser("u1", f as typeof fetch).catch((e) => e);
    expect(err).toBeInstanceOf(SelfModificationError);
    expect((err as SelfModificationError).action).toBe("delete");
  });

  it("re-propaga ForbiddenError con required (permiso)", async () => {
    const f = jest.fn().mockRejectedValue(new ForbiddenError("users:write"));
    await expect(deleteUser("u1", f as typeof fetch)).rejects.toThrow(ForbiddenError);
  });

  it("lanza NetworkError en respuesta no ok genérica", async () => {
    await expect(deleteUser("u1", makeFetch(500))).rejects.toThrow(NetworkError);
  });
});
