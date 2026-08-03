import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import { CustomerNotFoundError } from "../errors";

export async function softDeleteCustomer(
  { id }: { id: string },
  fetchImpl = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/customers/${id}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new CustomerNotFoundError();
  if (res.status === 204) return;
  if (!res.ok) throw new NetworkError();
}
