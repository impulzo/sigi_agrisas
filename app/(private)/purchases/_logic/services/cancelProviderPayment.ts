import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CancelProviderPaymentRequest, ProviderPaymentDto } from "../types/api";
import type { ProviderPayment } from "../types/domain";
import {
  ProviderPaymentNotFoundError,
  ProviderPaymentAlreadyCancelledError,
  PurchasePayCancelForbiddenError,
  PurchaseScopingForbiddenError,
} from "../errors";
import { mapProviderPaymentDto } from "../_mappers";

export async function cancelProviderPayment(
  id: string,
  body: CancelProviderPaymentRequest,
  fetchImpl = authFetch,
): Promise<ProviderPayment> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/provider-payments/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new PurchaseScopingForbiddenError();
      throw new PurchasePayCancelForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 404) throw new ProviderPaymentNotFoundError();
  if (res.status === 409) throw new ProviderPaymentAlreadyCancelledError();
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as ProviderPaymentDto;
  return mapProviderPaymentDto(dto);
}
