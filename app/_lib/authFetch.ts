import { schedule as scheduleRefresh } from "./session/refreshScheduler";
import { logoutClient } from "./logout";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Unauthenticated");
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  required?: string;
  constructor(required?: string) {
    super("Forbidden");
    this.name = "ForbiddenError";
    this.required = required;
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Network error");
    this.name = "NetworkError";
  }
}

export interface AuthFetchOptions extends RequestInit {
  skipAuth?: boolean;
  _isRetry?: boolean;
}

// Module-level dedupe: only one refresh in flight at a time
let pendingRefresh: Promise<string | null> | null = null;

async function doRefreshOnce(): Promise<string | null> {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const { accessToken } = (await res.json()) as { accessToken: string };
      if (typeof window !== "undefined") {
        sessionStorage.setItem("accessToken", accessToken);
      }
      scheduleRefresh(accessToken);
      return accessToken;
    } catch {
      return null;
    } finally {
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

export async function authFetch(
  input: string,
  init: AuthFetchOptions = {}
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (!init.skipAuth && typeof window !== "undefined") {
    const token = sessionStorage.getItem("accessToken");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    const { skipAuth: _skip, _isRetry: _r, ...fetchInit } = init;
    res = await fetch(input, { ...fetchInit, headers });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }

  if (res.status === 401 && !init._isRetry && !init.skipAuth) {
    const newToken = await doRefreshOnce();
    if (newToken) {
      return authFetch(input, { ...init, _isRetry: true });
    }
    // refresh failed — kick out
    logoutClient("session_lost").catch(() => {});
    throw new UnauthenticatedError();
  }

  if (res.status === 401) {
    logoutClient("session_lost").catch(() => {});
    throw new UnauthenticatedError();
  }

  if (res.status === 403) {
    let required: string | undefined;
    try {
      const body = await res.clone().json();
      required = body?.required as string | undefined;
    } catch {}
    throw new ForbiddenError(required);
  }

  return res;
}
