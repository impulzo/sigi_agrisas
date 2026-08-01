import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CancelWaybillRequest, WaybillDto } from "../types/api";
import type { WaybillDetail } from "../types/domain";
import {
  WaybillNotFoundError,
  WaybillAlreadyCancelledError,
  WaybillCancelForbiddenError,
  WaybillScopingForbiddenError,
} from "../errors";
import { mapWaybillDetailDto } from "../_mappers";

export async function cancelWaybill(
  id: string,
  body: CancelWaybillRequest,
  fetchImpl = authFetch
): Promise<WaybillDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/waybills/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new WaybillScopingForbiddenError();
      throw new WaybillCancelForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 404) throw new WaybillNotFoundError();
  if (res.status === 409) throw new WaybillAlreadyCancelledError();
  if (!res.ok) throw new NetworkError();

  const dto = (await res.json()) as WaybillDto;
  return mapWaybillDetailDto(dto);
}
