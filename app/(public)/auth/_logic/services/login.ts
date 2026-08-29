import { LoginPayload, AuthResponse } from "../types/api";
import {
  InvalidCredentialsError,
  NetworkError,
  PasswordNotSetError,
} from "../types/domain";

export async function login(
  payload: LoginPayload,
  fetchImpl: typeof fetch = fetch
): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401) throw new InvalidCredentialsError();
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    if (data?.error === "PasswordNotSet") throw new PasswordNotSetError();
    throw new NetworkError();
  }
  if (res.status >= 500) throw new NetworkError();
  if (!res.ok) throw new NetworkError();

  return res.json() as Promise<AuthResponse>;
}
