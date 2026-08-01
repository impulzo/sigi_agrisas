import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { PurchaseDetailDto } from "../types/api";
import type { PurchaseDetail } from "../types/domain";
import { PurchaseNotFoundError, PurchaseReadForbiddenError, PurchaseScopingForbiddenError } from "../errors";
import { mapPurchaseDetailDto } from "../_mappers";

export async function getPurchase(id: string, fetchImpl = authFetch): Promise<PurchaseDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/purchases/${id}`);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new PurchaseScopingForbiddenError();
      throw new PurchaseReadForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 404) throw new PurchaseNotFoundError();
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as PurchaseDetailDto;
  return mapPurchaseDetailDto(dto);
}
