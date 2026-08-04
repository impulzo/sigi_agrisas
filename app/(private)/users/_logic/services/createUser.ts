import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CreateUserBody, CreateUserResponse } from "../types/api";
import type { User } from "../types/domain";
import { EmailAlreadyInUseError, BranchNotFoundError } from "../errors";
import { toUser } from "./listUsers";

export async function createUser(
  body: CreateUserBody,
  fetchImpl = authFetch
): Promise<User> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof NetworkError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new EmailAlreadyInUseError();
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    if (data?.error === "Branch not found") throw new BranchNotFoundError();
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as CreateUserResponse;
  return toUser(data);
}
