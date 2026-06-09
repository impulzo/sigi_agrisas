import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { ReturnDto } from "../types/api";
import type { Return } from "../types/domain";
import { SaleNotFoundError, ReturnScopingForbiddenError, ReturnReadForbiddenError } from "../errors";
import { mapReturnDto } from "../_mappers";

export async function listSaleReturns(saleId: string, fetchImpl = authFetch): Promise<Return[]> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/sales/${saleId}/returns`);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new ReturnScopingForbiddenError();
      throw new ReturnReadForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 404) throw new SaleNotFoundError();
  if (!res.ok) throw new NetworkError();

  const body = await res.json() as { returns: ReturnDto[] };
  return body.returns.map(mapReturnDto);
}
