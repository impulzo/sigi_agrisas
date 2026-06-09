import { listUsers } from "../../../../../../app/(private)/users/_logic/services/listUsers";
import { NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../../app/_lib/authFetch";

function makeFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const USERS_RESPONSE = {
  users: [
    {
      id: "u1",
      name: "Test User",
      email: "test@example.com",
      avatarUrl: "https://gravatar.com/avatar/abc",
      roles: ["admin"],
      createdAt: "2026-05-14T07:12:59.006Z",
      updatedAt: "2026-05-14T07:12:59.006Z",
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

describe("listUsers", () => {
  it("devuelve usuarios con fechas convertidas a Date", async () => {
    const result = await listUsers({ page: 1, pageSize: 20 }, makeFetch(200, USERS_RESPONSE));
    expect(result.users).toHaveLength(1);
    expect(result.users[0].createdAt).toBeInstanceOf(Date);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("lanza NetworkError si la respuesta no es ok", async () => {
    await expect(listUsers({ page: 1, pageSize: 20 }, makeFetch(500, {}))).rejects.toThrow(NetworkError);
  });

  it("propaga UnauthenticatedError del fetchImpl", async () => {
    const f = jest.fn().mockRejectedValue(new UnauthenticatedError());
    await expect(listUsers({ page: 1, pageSize: 20 }, f as typeof fetch)).rejects.toThrow(UnauthenticatedError);
  });

  it("propaga ForbiddenError del fetchImpl", async () => {
    const f = jest.fn().mockRejectedValue(new ForbiddenError("users:read"));
    await expect(listUsers({ page: 1, pageSize: 20 }, f as typeof fetch)).rejects.toThrow(ForbiddenError);
  });
});
