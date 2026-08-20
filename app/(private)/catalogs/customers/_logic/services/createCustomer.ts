import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { CreateCustomerBody, CustomerDto } from "../types/api";
import type { Customer } from "../types/domain";
import { CustomerCodeAlreadyInUseError, CustomerRfcAlreadyInUseError } from "../errors";
import { toCustomer } from "./listCustomers";

export async function createCustomer(
  { body }: { body: CreateCustomerBody },
  fetchImpl = authFetch,
): Promise<Customer> {
  const normalized: CreateCustomerBody = {
    ...body,
    code: body.code.trim().toUpperCase(),
    rfc: body.rfc ? body.rfc.trim().toUpperCase() : body.rfc,
  };

  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) {
    const err = await res.json().catch(() => ({ error: "" }));
    const message = String(err?.error ?? "");
    if (message.includes("RFC already in use")) throw new CustomerRfcAlreadyInUseError();
    if (message.includes("code already in use")) throw new CustomerCodeAlreadyInUseError();
    throw new CustomerCodeAlreadyInUseError();
  }
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as CustomerDto;
  return toCustomer(data);
}
