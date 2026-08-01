import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { RegisterProviderPaymentRequest, ProviderPaymentDto } from "../types/api";
import type { ProviderPayment } from "../types/domain";
import {
  PurchaseNotFoundError,
  PurchaseNotPayableError,
  ProviderPaymentExceedsDueAmountError,
  PurchasePayForbiddenError,
  PurchaseScopingForbiddenError,
} from "../errors";
import { mapProviderPaymentDto } from "../_mappers";

export async function registerProviderPayment(
  purchaseId: string,
  body: RegisterProviderPaymentRequest,
  fetchImpl = authFetch,
): Promise<ProviderPayment> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/purchases/${purchaseId}/provider-payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new PurchaseScopingForbiddenError();
      throw new PurchasePayForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 404) throw new PurchaseNotFoundError();
  if (res.status === 409) {
    const errorBody = await res.json().catch(() => ({ error: "" })) as { error: string; due?: string };
    if (errorBody.due !== undefined) throw new ProviderPaymentExceedsDueAmountError(parseFloat(errorBody.due));
    throw new PurchaseNotPayableError();
  }
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as ProviderPaymentDto;
  return mapProviderPaymentDto(dto);
}
