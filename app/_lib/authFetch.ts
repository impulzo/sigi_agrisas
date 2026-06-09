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
    const { skipAuth: _skip, ...fetchInit } = init;
    res = await fetch(input, { ...fetchInit, headers });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }

  if (res.status === 401) throw new UnauthenticatedError();

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
