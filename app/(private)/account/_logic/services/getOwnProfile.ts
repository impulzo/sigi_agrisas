import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../_lib/authFetch";
import type { OwnProfileDto } from "../types/api";
import { AccountLoadError } from "../errors";

export async function getOwnProfile(fetchImpl: typeof authFetch = authFetch): Promise<OwnProfileDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/auth/me");
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (!res.ok) {
    let message: string | undefined;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // body no parseable — se usa el mensaje por defecto de AccountLoadError
    }
    throw new AccountLoadError(message);
  }
  return res.json() as Promise<OwnProfileDto>;
}
