import { updateUser } from "../../../../../../app/(private)/users/_logic/services/updateUser";
import { NetworkError, ForbiddenError } from "../../../../../../app/_lib/authFetch";
import { UserNotFoundError, EmailAlreadyInUseError, SelfModificationError } from "../../../../../../app/(private)/users/_logic/errors";

function makeFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const USER_DTO = {
  id: "u1", name: "User", email: "u@test.com",
  avatarUrl: "https://gravatar.com/avatar/abc",
  roles: ["admin"],
  createdAt: "2026-05-14T07:12:59.006Z",
  updatedAt: "2026-05-14T07:12:59.006Z",
};

describe("updateUser", () => {
  it("devuelve usuario actualizado con fecha Date en éxito", async () => {
    const result = await updateUser("u1", { name: "Nuevo" }, makeFetch(200, USER_DTO));
    expect(result.name).toBe("User");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("mapea 404 a UserNotFoundError", async () => {
    await expect(updateUser("u1", { name: "x" }, makeFetch(404, { error: "User not found" }))).rejects.toThrow(UserNotFoundError);
  });

  it("mapea 409 a EmailAlreadyInUseError", async () => {
    await expect(updateUser("u1", { email: "taken@test.com" }, makeFetch(409, { error: "Email already in use" }))).rejects.toThrow(EmailAlreadyInUseError);
  });

  it("mapea ForbiddenError sin required a SelfModificationError", async () => {
    const f = jest.fn().mockRejectedValue(new ForbiddenError());
    await expect(updateUser("u1", { name: "x" }, f as typeof fetch)).rejects.toThrow(SelfModificationError);
  });

  it("re-propaga ForbiddenError con required (permiso)", async () => {
    const f = jest.fn().mockRejectedValue(new ForbiddenError("users:write"));
    await expect(updateUser("u1", { name: "x" }, f as typeof fetch)).rejects.toThrow(ForbiddenError);
  });

  it("lanza NetworkError en respuesta no ok genérica", async () => {
    await expect(updateUser("u1", { name: "x" }, makeFetch(500, {}))).rejects.toThrow(NetworkError);
  });
});
