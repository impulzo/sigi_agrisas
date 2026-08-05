import { authFetch, NetworkError, ForbiddenError } from "../../../../_lib/authFetch";
import type { CreateSaleBody, SaleDetailDto } from "../types/api";
import {
  CustomerInactiveError,
  BranchInactiveError,
  FolioInactiveError,
  FolioScopeMismatchError,
  PaymentMethodInactiveError,
  ProductInactiveError,
  ProductPriceMismatchError,
  EmptyCartError,
  SaleScopingForbiddenError,
  SaleCreateForbiddenError,
} from "../errors";

function mapErrorMessage(message: string): Error {
  const msg = message.toLowerCase();
  if (msg.includes("customer") && msg.includes("inactive")) return new CustomerInactiveError();
  if (msg.includes("branch") && msg.includes("inactive")) return new BranchInactiveError();
  if (msg.includes("folio") && msg.includes("inactive")) return new FolioInactiveError();
  if (msg.includes("payment") && msg.includes("inactive")) return new PaymentMethodInactiveError();
  if (msg.includes("product") && msg.includes("inactive")) return new ProductInactiveError();
  if (msg.includes("price") && msg.includes("mismatch")) return new ProductPriceMismatchError();
  if (msg.includes("empty") || msg.includes("no items")) return new EmptyCartError();
  return new NetworkError();
}

export async function createSale(
  body: CreateSaleBody,
  fetchImpl = authFetch,
): Promise<SaleDetailDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 400) {
    const errBody = await res.json().catch(() => ({ error: "" })) as { error?: string; expected?: string; actual?: string };
    if (errBody.error === "FolioScopeMismatch") throw new FolioScopeMismatchError(errBody.expected ?? "", errBody.actual ?? "");
    throw mapErrorMessage(errBody.error ?? "");
  }

  if (res.status === 403) {
    let errBody: { error?: string } = {};
    try { errBody = await res.json(); } catch { /* ignore */ }
    const msg = (errBody.error ?? "").toLowerCase();
    if (msg.includes("branch") || msg.includes("scope")) throw new SaleScopingForbiddenError();
    throw new SaleCreateForbiddenError();
  }

  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as SaleDetailDto;
  return dto;
}
