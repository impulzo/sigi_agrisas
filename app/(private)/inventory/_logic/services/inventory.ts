import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../_lib/authFetch";
import type {
  BranchInventoryDto,
  ListBranchInventoryResponse,
  ListBranchInventoryParams,
  AssignProductBody,
  UpdateInventoryBody,
  AdjustStockBody,
} from "../types/api";
import type { InventoryItem } from "../types/domain";
import {
  InventoryRecordNotFoundError,
  InventoryAlreadyExistsError,
  NegativeStockNotAllowedError,
  InventoryTargetInvalidError,
} from "../errors";

export function toInventoryItem(dto: BranchInventoryDto): InventoryItem {
  return {
    id: dto.id,
    branchId: dto.branchId,
    productId: dto.productId,
    productCode: dto.productCode,
    productName: dto.productName,
    quantity: dto.quantity,
    reservedQuantity: dto.reservedQuantity,
    reorderPoint: dto.reorderPoint,
    updatedAt: new Date(dto.updatedAt),
  };
}

async function safeRethrow(err: unknown): Promise<never> {
  if (
    err instanceof NetworkError ||
    err instanceof UnauthenticatedError ||
    err instanceof ForbiddenError
  )
    throw err;
  if ((err as Error).name === "AbortError") throw err;
  throw new NetworkError();
}

const BASE = (branchId: string) => `/api/v1/admin/branches/${branchId}/inventory`;

export async function listBranchInventory(
  { branchId, page, pageSize, search, belowReorder }: ListBranchInventoryParams,
  fetchImpl = authFetch,
  signal?: AbortSignal,
): Promise<{ items: InventoryItem[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const trimmed = search?.trim();
  if (trimmed && trimmed.length >= 1) params.set("search", trimmed);
  if (belowReorder) params.set("belowReorder", "true");

  let res: Response;
  try {
    res = await fetchImpl(`${BASE(branchId)}?${params.toString()}`, { signal });
  } catch (err) {
    return safeRethrow(err);
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListBranchInventoryResponse;
  return { items: body.items.map(toInventoryItem), total: body.total, page: body.page, pageSize: body.pageSize };
}

export async function assignProduct(
  { branchId, body }: { branchId: string; body: AssignProductBody },
  fetchImpl = authFetch,
): Promise<InventoryItem> {
  let res: Response;
  try {
    res = await fetchImpl(BASE(branchId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return safeRethrow(err);
  }
  if (res.status === 409) throw new InventoryAlreadyExistsError();
  if (res.status === 400) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new InventoryTargetInvalidError(data.error);
  }
  if (!res.ok) throw new NetworkError();
  const dto = (await res.json()) as BranchInventoryDto;
  return toInventoryItem(dto);
}

export async function updateInventoryItem(
  { branchId, productId, body }: { branchId: string; productId: string; body: UpdateInventoryBody },
  fetchImpl = authFetch,
): Promise<InventoryItem> {
  let res: Response;
  try {
    res = await fetchImpl(`${BASE(branchId)}/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return safeRethrow(err);
  }
  if (res.status === 404) throw new InventoryRecordNotFoundError();
  if (!res.ok) throw new NetworkError();
  const dto = (await res.json()) as BranchInventoryDto;
  return toInventoryItem(dto);
}

export async function adjustStock(
  { branchId, productId, body }: { branchId: string; productId: string; body: AdjustStockBody },
  fetchImpl = authFetch,
): Promise<InventoryItem> {
  let res: Response;
  try {
    res = await fetchImpl(`${BASE(branchId)}/${productId}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return safeRethrow(err);
  }
  if (res.status === 404) throw new InventoryRecordNotFoundError();
  if (res.status === 409) throw new NegativeStockNotAllowedError();
  if (!res.ok) throw new NetworkError();
  const dto = (await res.json()) as BranchInventoryDto;
  return toInventoryItem(dto);
}

export async function removeInventoryItem(
  { branchId, productId }: { branchId: string; productId: string },
  fetchImpl = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`${BASE(branchId)}/${productId}`, { method: "DELETE" });
  } catch (err) {
    return safeRethrow(err);
  }
  if (res.status === 404) throw new InventoryRecordNotFoundError();
  if (!res.ok) throw new NetworkError();
}
