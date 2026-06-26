import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CreateReturnRequest, ReturnDetailDto } from "../types/api";
import type { ReturnDetail } from "../types/domain";
import {
  SaleNotFoundError,
  SaleItemNotPartOfSaleError,
  ReturnItemsEmptyError,
  SaleNotReturnableError,
  ReturnQuantityExceedsRemainingError,
  ReturnCreateForbiddenError,
  ReturnScopingForbiddenError,
} from "../errors";
import { mapReturnDetailDto } from "../_mappers";

export async function createReturn(body: CreateReturnRequest, fetchImpl = authFetch): Promise<ReturnDetail> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new ReturnScopingForbiddenError();
      throw new ReturnCreateForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 400) {
    const errorBody = await res.json() as { error: string; field?: string; saleItemId?: string; requested?: number; remaining?: number };
    if (errorBody.error === "Sale not found") throw new SaleNotFoundError();
    if (errorBody.error === "Return must include at least one item") throw new ReturnItemsEmptyError();
    if (errorBody.saleItemId && !errorBody.requested) throw new SaleItemNotPartOfSaleError(errorBody.saleItemId);
    throw new NetworkError();
  }

  if (res.status === 409) {
    const errorBody = await res.json() as { error: string; status?: string; saleItemId?: string; requested?: number; remaining?: number };
    if (errorBody.saleItemId && errorBody.requested !== undefined && errorBody.remaining !== undefined) {
      throw new ReturnQuantityExceedsRemainingError(errorBody.saleItemId, errorBody.requested, errorBody.remaining);
    }
    if (errorBody.status) throw new SaleNotReturnableError(errorBody.status);
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as ReturnDetailDto;
  return mapReturnDetailDto(dto);
}
