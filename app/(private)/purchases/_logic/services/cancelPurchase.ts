import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CancelPurchaseRequest, PurchaseDetailDto } from "../types/api";
import type { PurchaseDetail } from "../types/domain";
import {
  PurchaseNotFoundError,
  PurchaseAlreadyCancelledError,
  PurchaseHasActiveProviderPaymentsError,
  PurchaseCancelForbiddenError,
  PurchaseScopingForbiddenError,
} from "../errors";
import { mapPurchaseDetailDto } from "../_mappers";

export async function cancelPurchase(id: string, body: CancelPurchaseRequest, fetchImpl = authFetch): Promise<PurchaseDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/purchases/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new PurchaseScopingForbiddenError();
      throw new PurchaseCancelForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 404) throw new PurchaseNotFoundError();
  if (res.status === 409) {
    const errorBody = await res.json().catch(() => ({ error: "" })) as { error: string; providerPaymentIds?: string[] };
    if (errorBody.providerPaymentIds) throw new PurchaseHasActiveProviderPaymentsError(errorBody.providerPaymentIds);
    throw new PurchaseAlreadyCancelledError();
  }
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as PurchaseDetailDto;
  return mapPurchaseDetailDto(dto);
}
