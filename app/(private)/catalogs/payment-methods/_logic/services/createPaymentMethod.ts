import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { CreatePaymentMethodBody, PaymentMethodDto } from "../types/api";
import type { PaymentMethod } from "../types/domain";
import { PaymentMethodCodeAlreadyInUseError } from "../errors";
import { toPaymentMethod } from "./listPaymentMethods";

export async function createPaymentMethod(
  { body }: { body: CreatePaymentMethodBody },
  fetchImpl = authFetch
): Promise<PaymentMethod> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new PaymentMethodCodeAlreadyInUseError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as PaymentMethodDto;
  return toPaymentMethod(data);
}
