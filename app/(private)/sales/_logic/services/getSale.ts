import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { SaleDetailDto } from "../types/api";
import type { SaleDetail } from "../types/domain";
import { SaleNotFoundError, SaleScopingForbiddenError } from "../errors";
import { toSaleDetail } from "./_mappers";

export async function getSale(id: string, fetchImpl = authFetch): Promise<SaleDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/sales/${id}`);
  } catch {
    throw new NetworkError();
  }

  if (res.status === 404) throw new SaleNotFoundError();
  if (res.status === 403) throw new SaleScopingForbiddenError();
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as SaleDetailDto;
  return toSaleDetail(dto);
}
