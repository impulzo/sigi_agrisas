import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import { UserNotFoundError, SelfModificationError } from "../errors";

export async function deleteUser(id: string, fetchImpl = authFetch): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/users/${id}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      if (!err.required) throw new SelfModificationError("delete");
      throw err;
    }
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new UserNotFoundError();
  if (res.status === 204) return;
  if (!res.ok) throw new NetworkError();
}
