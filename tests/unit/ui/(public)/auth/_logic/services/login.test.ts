import { login } from "../../../../../../../app/(public)/auth/_logic/services/login";
import {
  InvalidCredentialsError,
  NetworkError,
} from "../../../../../../../app/(public)/auth/_logic/types/domain";

function makeFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("login service", () => {
  it("returns AuthResponse on 200", async () => {
    const mockAuth = { accessToken: "tok", user: { id: "1", name: "A", email: "a@b.com" } };
    const result = await login({ email: "a@b.com", password: "pass" }, makeFetch(200, mockAuth));
    expect(result).toEqual(mockAuth);
  });

  it("throws InvalidCredentialsError on 401", async () => {
    await expect(
      login({ email: "a@b.com", password: "bad" }, makeFetch(401, {}))
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws NetworkError on 500", async () => {
    await expect(
      login({ email: "a@b.com", password: "pass" }, makeFetch(500, {}))
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it("throws NetworkError on network failure", async () => {
    const failFetch = jest.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    await expect(
      login({ email: "a@b.com", password: "pass" }, failFetch)
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
