import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CreatePurchaseRequest, PurchaseDetailDto } from "../types/api";
import type { PurchaseDetail } from "../types/domain";
import {
  ProviderNotFoundOrInactiveError,
  ProductNotFoundOrInactiveError,
  PurchaseItemsEmptyError,
  SatUuidAlreadyExistsError,
  PurchaseCreateForbiddenError,
  PurchaseScopingForbiddenError,
} from "../errors";
import { mapPurchaseDetailDto } from "../_mappers";

export async function createPurchase(body: CreatePurchaseRequest, fetchImpl = authFetch): Promise<PurchaseDetail> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new PurchaseScopingForbiddenError();
      throw new PurchaseCreateForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 409) {
    const errorBody = await res.json().catch(() => ({ error: "" })) as { error: string };
    if (errorBody.error === "A purchase with this SAT UUID already exists") throw new SatUuidAlreadyExistsError();
    throw new NetworkError();
  }

  if (res.status === 400) {
    const errorBody = await res.json().catch(() => ({ error: "" })) as { error: string };
    if (errorBody.error === "Provider not found or inactive") throw new ProviderNotFoundOrInactiveError();
    if (errorBody.error === "Product not found or inactive") throw new ProductNotFoundOrInactiveError();
    if (errorBody.error === "Purchase must include at least one item") throw new PurchaseItemsEmptyError();
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as PurchaseDetailDto;
  return mapPurchaseDetailDto(dto);
}
