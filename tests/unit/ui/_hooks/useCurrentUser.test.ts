/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCurrentUser } from "../../../../app/_hooks/useCurrentUser";

function makeToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function makeResponse(body: unknown, opts?: { ok?: boolean; status?: number }) {
  return {
    ok: opts?.ok ?? true,
    status: opts?.status ?? 200,
    json: () => Promise.resolve(body),
    clone: () => makeResponse(body, opts),
  };
}

const originalFetch = global.fetch;

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("useCurrentUser", () => {
  it("exposes roles from a valid JWT", async () => {
    // Use unique userId to avoid cache collision
    sessionStorage.setItem("accessToken", makeToken({ sub: "uc-test-001", email: "a@b.com", roles: ["admin"], exp: 9999999999 }));
    global.fetch = jest.fn().mockResolvedValue(
      makeResponse({ permissions: ["roles:read"] })
    ) as jest.Mock;

    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual(["admin"]);
    expect(result.current.email).toBe("a@b.com");
  });

  it("exposes empty roles when token is absent", async () => {
    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual([]);
    expect(result.current.userId).toBe("");
  });

  it("expone branchId desde el claim JWT", async () => {
    sessionStorage.setItem(
      "accessToken",
      makeToken({ sub: "uc-test-branch-01", email: "b@b.com", roles: ["operator"], branchId: "branch-abc", exp: 9999999999 })
    );
    global.fetch = jest.fn().mockResolvedValue(makeResponse({ permissions: [] })) as jest.Mock;
    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.branchId).toBe("branch-abc");
  });

  it("branchId es null cuando el claim no está presente", async () => {
    sessionStorage.setItem(
      "accessToken",
      makeToken({ sub: "uc-test-branch-02", email: "c@b.com", roles: ["admin"], exp: 9999999999 })
    );
    global.fetch = jest.fn().mockResolvedValue(makeResponse({ permissions: [] })) as jest.Mock;
    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.branchId).toBeNull();
  });

  it("branchId es null cuando el claim es cadena vacía", async () => {
    sessionStorage.setItem(
      "accessToken",
      makeToken({ sub: "uc-test-branch-03", email: "d@b.com", roles: ["operator"], branchId: "", exp: 9999999999 })
    );
    global.fetch = jest.fn().mockResolvedValue(makeResponse({ permissions: [] })) as jest.Mock;
    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // empty string → treated as falsy → null via `?? null`
    expect(result.current.branchId).toBeNull();
  });

  it("can() returns 'loading' before permissions fetch resolves", async () => {
    sessionStorage.setItem("accessToken", makeToken({ sub: "uc-test-002", email: "a@b.com", roles: ["viewer"], exp: 9999999999 }));
    let resolve!: (v: object) => void;
    global.fetch = jest.fn().mockImplementationOnce(
      () => new Promise<object>((res) => { resolve = res; }).then((body) => makeResponse(body))
    ) as jest.Mock;

    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.can("roles:read")).toBe("loading");
    resolve({ permissions: ["roles:read"] });
    await waitFor(() => expect(result.current.can("roles:read")).toBe(true));
  });

  it("no cachea el resultado cuando la respuesta HTTP no es ok (ej. 403 por guard mal configurado)", async () => {
    sessionStorage.setItem(
      "accessToken",
      makeToken({ sub: "uc-test-403-01", email: "e@b.com", roles: ["tienda_zarioz"], exp: 9999999999 })
    );
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(makeResponse({ error: "Forbidden", required: "users:read" }, { ok: false, status: 403 }))
      .mockResolvedValueOnce(makeResponse({ permissions: ["sales:read"] }));
    global.fetch = fetchMock as jest.Mock;

    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.can("sales:read")).toBe(false));

    act(() => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.can("sales:read")).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
