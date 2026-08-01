import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { UpdateCustomerBody, CustomerDto } from "../types/api";
import type { Customer } from "../types/domain";
import { CustomerNotFoundError, CustomerRfcAlreadyInUseError } from "../errors";
import { toCustomer } from "./listCustomers";

export async function updateCustomer(
  { id, body }: { id: string; body: UpdateCustomerBody },
  fetchImpl = authFetch,
): Promise<Customer> {
  const normalized: UpdateCustomerBody = { ...body };
  if (typeof normalized.rfc === "string") {
    normalized.rfc = normalized.rfc.trim().toUpperCase();
  }

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new CustomerNotFoundError();
  if (res.status === 409) {
    const err = await res.json().catch(() => ({ error: "" }));
    const message = String(err?.error ?? "");
    if (message.includes("RFC already in use")) throw new CustomerRfcAlreadyInUseError();
    throw new CustomerRfcAlreadyInUseError();
  }
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as CustomerDto;
  return toCustomer(data);
}
