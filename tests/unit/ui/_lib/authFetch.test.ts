/**
 * @jest-environment jsdom
 */
import { authFetch, UnauthenticatedError, ForbiddenError, NetworkError } from "../../../../app/_lib/authFetch";

// mock logoutClient to avoid window.location.assign side-effects in tests
jest.mock("../../../../app/_lib/logout", () => ({
  logoutClient: jest.fn().mockResolvedValue(undefined),
  setLogoutChannel: jest.fn(),
}));

// mock refreshScheduler to avoid scheduling real timers
jest.mock("../../../../app/_lib/session/refreshScheduler", () => ({
  schedule: jest.fn(),
  cancel: jest.fn(),
  _getDelay: jest.fn().mockReturnValue(840_000),
}));

import { logoutClient } from "../../../../app/_lib/logout";

function makeResponse(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    clone: () => makeResponse(status, body),
  } as unknown as Response;
}

beforeEach(() => {
  sessionStorage.clear();
  jest.clearAllMocks();
});

describe("authFetch — basic", () => {
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

describe("authFetch — 401 refresh + retry", () => {
  it("on 401: refreshes and retries, returns 200", async () => {
    // 1st call: original request → 401
    // 2nd call: POST /api/v1/auth/refresh → 200 + new token
    // 3rd call: retry original → 200
    global.fetch = jest.fn()
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200, { accessToken: "new-token" }))
      .mockResolvedValueOnce(makeResponse(200, { data: "ok" })) as jest.Mock;

    const res = await authFetch("/test");
    expect(res.status).toBe(200);
    expect(sessionStorage.getItem("accessToken")).toBe("new-token");
  });

  it("on 401 + refresh 401: calls logoutClient and throws UnauthenticatedError", async () => {
    // 1st: original → 401; 2nd: refresh → 401; 3rd: logout POST
    global.fetch = jest.fn()
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200)) as jest.Mock;

    await expect(authFetch("/test")).rejects.toThrow(UnauthenticatedError);
    expect(logoutClient).toHaveBeenCalledWith("session_lost");
  });

  it("deduplicates concurrent 401s into a single refresh call", async () => {
    // All 5 original requests get 401; refresh is called once (200); all retries get 200
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url === "/api/v1/auth/refresh") {
        return makeResponse(200, { accessToken: "deduped-token" });
      }
      if (callCount <= 5) return makeResponse(401); // first 5 original calls → 401
      return makeResponse(200, { data: "ok" }); // retries succeed
    }) as jest.Mock;

    const results = await Promise.all([
      authFetch("/test"),
      authFetch("/test"),
      authFetch("/test"),
      authFetch("/test"),
      authFetch("/test"),
    ]);

    const refreshCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]: [string]) => url === "/api/v1/auth/refresh"
    );
    expect(refreshCalls.length).toBe(1);
    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  it("skipAuth=true does NOT trigger refresh on 401", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeResponse(401)) as jest.Mock;
    await expect(authFetch("/test", { skipAuth: true })).rejects.toThrow(UnauthenticatedError);
    // only 1 fetch call (no refresh attempt)
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
  });
});
