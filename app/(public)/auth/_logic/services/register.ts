import { RegisterPayload, AuthResponse } from "../types/api";
import {
  EmailAlreadyExistsError,
  NetworkError,
} from "../types/domain";

export async function register(
  payload: RegisterPayload,
  fetchImpl: typeof fetch = fetch
): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 409) throw new EmailAlreadyExistsError();
  if (res.status >= 500) throw new NetworkError();
  if (!res.ok) throw new NetworkError();

  return res.json() as Promise<AuthResponse>;
}
