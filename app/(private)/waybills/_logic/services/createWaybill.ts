import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CreateWaybillRequest, WaybillDto } from "../types/api";
import type { WaybillDetail } from "../types/domain";
import {
  InvalidBranchPairError,
  BranchAddressIncompleteError,
  InsufficientStockAtOriginError,
  FacturamaStampError,
  WaybillWriteForbiddenError,
  WaybillScopingForbiddenError,
} from "../errors";
import { mapWaybillDetailDto } from "../_mappers";

export async function createWaybill(body: CreateWaybillRequest, fetchImpl = authFetch): Promise<WaybillDetail> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/waybills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new WaybillScopingForbiddenError();
      throw new WaybillWriteForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 400) {
    const errBody = await res.json().catch(() => ({}));
    if (errBody.error === "BranchAddressIncomplete") {
      throw new BranchAddressIncompleteError(errBody.branchId, errBody.missingFields ?? []);
    }
    throw new InvalidBranchPairError();
  }
  if (res.status === 409) {
    const errBody = await res.json().catch(() => ({}));
    throw new InsufficientStockAtOriginError(errBody.productId);
  }
  if (res.status === 422) {
    const errBody = await res.json().catch(() => ({}));
    throw new FacturamaStampError(errBody.detail ?? "");
  }
  if (!res.ok) throw new NetworkError();

  const dto = (await res.json()) as WaybillDto;
  return mapWaybillDetailDto(dto);
}
