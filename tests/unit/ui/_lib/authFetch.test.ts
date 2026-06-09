import { authFetch, UnauthenticatedError, ForbiddenError, NetworkError } from "../../../../app/_lib/authFetch";

function makeResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    clone: () => makeResponse(status, body),
  };
}

const originalFetch = global.fetch;

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("authFetch", () => {
  it("injects Authorization header when token is present", async () => {
    sessionStorage.setItem("accessToken", "my-token");
    const capturedHeaders: Record<string, string> = {};
    global.fetch = jest.fn().mockImplementationOnce((_url: string, init?: RequestInit) => {
      new Headers(init?.headers).forEach((v, k) => { capturedHeaders[k] = v; });
      return Promise.resolve(makeResponse(200, {}));
    }) as jest.Mock;
    await authFetch("/test");
    expect(capturedHeaders["authorization"]).toBe("Bearer my-token");
  });

  it("does not inject Authorization when skipAuth is true", async () => {
    sessionStorage.setItem("accessToken", "my-token");
    const capturedHeaders: Record<string, string> = {};
    global.fetch = jest.fn().mockImplementationOnce((_url: string, init?: RequestInit) => {
      new Headers(init?.headers).forEach((v, k) => { capturedHeaders[k] = v; });
      return Promise.resolve(makeResponse(200, {}));
    }) as jest.Mock;
    await authFetch("/test", { skipAuth: true });
    expect(capturedHeaders["authorization"]).toBeUndefined();
  });

  it("throws NetworkError when fetch rejects with generic error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("offline")) as jest.Mock;
    await expect(authFetch("/test")).rejects.toThrow(NetworkError);
  });

  it("re-throws AbortError when fetch is aborted", async () => {
    const abortErr = Object.assign(new Error("The user aborted a request."), { name: "AbortError" });
    global.fetch = jest.fn().mockRejectedValueOnce(abortErr) as jest.Mock;
    const err = await authFetch("/test").catch((e) => e);
    expect(err.name).toBe("AbortError");
    expect(err).not.toBeInstanceOf(NetworkError);
  });

  it("throws UnauthenticatedError on 401", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeResponse(401, {})) as jest.Mock;
    await expect(authFetch("/test")).rejects.toThrow(UnauthenticatedError);
  });

  it("throws ForbiddenError with required on 403", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(403, { error: "Forbidden", required: "roles:read" })
    ) as jest.Mock;
    const err = await authFetch("/test").catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenError);
    expect((err as ForbiddenError).required).toBe("roles:read");
  });

  it("returns Response for 200 OK", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeResponse(200, { ok: true })) as jest.Mock;
    const res = await authFetch("/test");
    expect(res.status).toBe(200);
  });
});
