import { SetPasswordPayload, AuthResponse } from "../types/api";
import {
  NetworkError,
  PasswordSetupTokenExpiredError,
  PasswordSetupTokenInvalidError,
} from "../types/domain";

export async function setPassword(
  payload: SetPasswordPayload,
  fetchImpl: typeof fetch = fetch
): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    if (data?.error === "PasswordSetupTokenExpired") throw new PasswordSetupTokenExpiredError();
    if (data?.error === "PasswordSetupTokenInvalid") throw new PasswordSetupTokenInvalidError();
    throw new NetworkError();
  }
  if (res.status >= 500) throw new NetworkError();
  if (!res.ok) throw new NetworkError();

  return res.json() as Promise<AuthResponse>;
}
