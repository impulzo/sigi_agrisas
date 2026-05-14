import { register } from "../../../../../../../app/(public)/auth/_logic/services/register";
import {
  EmailAlreadyExistsError,
  NetworkError,
} from "../../../../../../../app/(public)/auth/_logic/types/domain";

function makeFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("register service", () => {
  it("returns AuthResponse on 201", async () => {
    const mockAuth = { accessToken: "tok", user: { id: "2", name: "B", email: "b@c.com" } };
    const result = await register(
      { name: "B", email: "b@c.com", password: "pass123" },
      makeFetch(201, mockAuth)
    );
    expect(result).toEqual(mockAuth);
  });

  it("throws EmailAlreadyExistsError on 409", async () => {
    await expect(
      register({ name: "B", email: "b@c.com", password: "pass123" }, makeFetch(409, {}))
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it("throws NetworkError on 500", async () => {
    await expect(
      register({ name: "B", email: "b@c.com", password: "pass123" }, makeFetch(500, {}))
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it("throws NetworkError on network failure", async () => {
    const failFetch = jest.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    await expect(
      register({ name: "B", email: "b@c.com", password: "pass123" }, failFetch)
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
