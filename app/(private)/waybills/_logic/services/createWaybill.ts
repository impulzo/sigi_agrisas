import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CreateWaybillRequest, WaybillDto } from "../types/api";
import type { WaybillDetail } from "../types/domain";
import {
  InvalidBranchPairError,
  BranchAddressIncompleteError,
  ProductRequiredForSimpleTransferError,
  ProductNotFoundForTransferError,
  InsufficientStockAtOriginError,
  FacturamaStampError,
  WaybillWriteForbiddenError,
  WaybillStampForbiddenError,
  WaybillScopingForbiddenError,
  WaybillSaleNotFoundError,
  SaleNotCompletedError,
  SaleHasNoCustomerError,
  CustomerNotFoundForWaybillError,
  CustomerAddressIncompleteError,
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
      if (err.required === "waybills:stamp") throw new WaybillStampForbiddenError();
      throw new WaybillWriteForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 403) {
    const errBody = await res.json().catch(() => ({}));
    if (errBody.required === "waybills:stamp") throw new WaybillStampForbiddenError();
    if (errBody.required === "branches:access_all") throw new WaybillScopingForbiddenError();
    throw new WaybillWriteForbiddenError();
  }
  if (res.status === 400) {
    const errBody = await res.json().catch(() => ({}));
    if (errBody.error === "BranchAddressIncomplete") {
      throw new BranchAddressIncompleteError(errBody.branchId, errBody.missingFields ?? []);
    }
    if (errBody.error === "ProductRequiredForSimpleTransfer") {
      throw new ProductRequiredForSimpleTransferError(errBody.itemIndex);
    }
    if (errBody.error === "ProductNotFound") {
      throw new ProductNotFoundForTransferError(errBody.productId);
    }
    if (errBody.error === "CustomerAddressIncomplete") {
      throw new CustomerAddressIncompleteError(errBody.customerId, errBody.missingFields ?? []);
    }
    throw new InvalidBranchPairError();
  }
  if (res.status === 404) {
    const errBody = await res.json().catch(() => ({}));
    if (errBody.error === "SaleNotFound") throw new WaybillSaleNotFoundError();
    if (errBody.error === "CustomerNotFound") throw new CustomerNotFoundForWaybillError();
    throw new NetworkError();
  }
  if (res.status === 409) {
    const errBody = await res.json().catch(() => ({}));
    if (errBody.error === "SaleNotCompleted") throw new SaleNotCompletedError();
    if (errBody.error === "SaleHasNoCustomer") throw new SaleHasNoCustomerError();
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
