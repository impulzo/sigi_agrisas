import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { CancelSaleBody, SaleDetailDto } from "../types/api";
import type { SaleDetail } from "../types/domain";
import { SaleNotFoundError, SaleScopingForbiddenError } from "../errors";
import { toSaleDetail } from "./_mappers";

export async function cancelSale(
  id: string,
  body: CancelSaleBody,
  fetchImpl = authFetch,
): Promise<SaleDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/sales/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 404) throw new SaleNotFoundError();
  if (res.status === 403) throw new SaleScopingForbiddenError();
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as SaleDetailDto;
  return toSaleDetail(dto);
}
