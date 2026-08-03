import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { CustomerDto } from "../types/api";
import type { Customer } from "../types/domain";
import { CustomerNotFoundError } from "../errors";
import { toCustomer } from "./listCustomers";

export async function getCustomer(
  { id }: { id: string },
  fetchImpl = authFetch,
): Promise<Customer> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/customers/${id}`);
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new CustomerNotFoundError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as CustomerDto;
  return toCustomer(data);
}
