import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { PaymentHistoryReportDto } from "../types/api";
import type { PaymentHistoryFilters } from "../types/domain";

export async function getPaymentsHistory(
  filters: PaymentHistoryFilters & { page?: number; pageSize?: number; signal?: AbortSignal },
  fetchImpl = authFetch,
): Promise<PaymentHistoryReportDto> {
  const { page = 1, pageSize = 50, signal, userId, customerId, productId, paymentMethodId, status, from, to, branchId } = filters;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (userId) params.set("userId", userId);
  if (customerId) params.set("customerId", customerId);
  if (productId) params.set("productId", productId);
  if (paymentMethodId) params.set("paymentMethodId", paymentMethodId);
  if (status) params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (branchId) params.set("branchId", branchId);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/payments/history?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }

  if (res.status === 409) {
    const data = await res.json() as { error: string };
    if (data.error === "ReportTooLarge") {
      const e = new Error("El conjunto de datos supera 10,000 registros. Aplica más filtros.");
      e.name = "ReportTooLargeError";
      throw e;
    }
  }

  if (!res.ok) throw new NetworkError();

  return res.json() as Promise<PaymentHistoryReportDto>;
}

export async function downloadPaymentsHistoryPdf(
  filters: PaymentHistoryFilters,
  fetchImpl = authFetch,
): Promise<Blob> {
  const params = new URLSearchParams({ format: "pdf" });
  const { userId, customerId, productId, paymentMethodId, status, from, to, branchId } = filters;
  if (userId) params.set("userId", userId);
  if (customerId) params.set("customerId", customerId);
  if (productId) params.set("productId", productId);
  if (paymentMethodId) params.set("paymentMethodId", paymentMethodId);
  if (status) params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (branchId) params.set("branchId", branchId);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/payments/history?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }

  if (res.status === 409) {
    const data = await res.json() as { error: string };
    if (data.error === "ReportTooLarge") {
      const e = new Error("El conjunto de datos supera 10,000 registros. Aplica más filtros.");
      e.name = "ReportTooLargeError";
      throw e;
    }
  }

  if (!res.ok) throw new NetworkError();

  return res.blob();
}
