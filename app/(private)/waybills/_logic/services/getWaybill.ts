import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { WaybillDto } from "../types/api";
import type { WaybillDetail } from "../types/domain";
import { WaybillNotFoundError, WaybillReadForbiddenError, WaybillScopingForbiddenError } from "../errors";
import { mapWaybillDetailDto } from "../_mappers";

export async function getWaybill(id: string, fetchImpl = authFetch): Promise<WaybillDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/waybills/${id}`);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new WaybillScopingForbiddenError();
      throw new WaybillReadForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 404) throw new WaybillNotFoundError();
  if (!res.ok) throw new NetworkError();

  const dto = (await res.json()) as WaybillDto;
  return mapWaybillDetailDto(dto);
}
