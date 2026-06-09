import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import { PaymentMethodNotFoundError } from "../errors";

export async function softDeletePaymentMethod(
  { id }: { id: string },
  fetchImpl = authFetch
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/payment-methods/${id}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new PaymentMethodNotFoundError();
  if (res.status === 204) return;
  if (!res.ok) throw new NetworkError();
}
