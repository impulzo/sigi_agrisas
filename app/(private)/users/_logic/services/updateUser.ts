import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { UpdateUserBody, UpdateUserResponse } from "../types/api";
import type { User } from "../types/domain";
import { UserNotFoundError, EmailAlreadyInUseError, SelfModificationError } from "../errors";
import { toUser } from "./listUsers";

export async function updateUser(
  id: string,
  body: UpdateUserBody,
  fetchImpl = authFetch
): Promise<User> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      if (!err.required) throw new SelfModificationError("modify");
      throw err;
    }
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new EmailAlreadyInUseError();
  if (res.status === 404) throw new UserNotFoundError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as UpdateUserResponse;
  return toUser(data);
}
