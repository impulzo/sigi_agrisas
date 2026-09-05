import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../_lib/authFetch";
import type { UpdateOwnProfileBody, UpdateOwnProfileResponse } from "../types/api";
import { EmailAlreadyInUseError } from "../errors";

export async function updateOwnProfile(
  body: UpdateOwnProfileBody,
  fetchImpl: typeof authFetch = authFetch
): Promise<UpdateOwnProfileResponse> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new EmailAlreadyInUseError();
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<UpdateOwnProfileResponse>;
}
