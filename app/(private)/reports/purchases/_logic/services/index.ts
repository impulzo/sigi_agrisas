import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import type { PurchasesReportDto, ProviderPaymentsReportDto } from "../types/api";
import type { PurchasesReportFilters, ProviderPaymentsReportFilters } from "../types/domain";

const PURCHASES_BASE = "/api/v1/admin/reports/purchases";
const PROVIDER_PAYMENTS_BASE = "/api/v1/admin/reports/purchases/provider-payments";

function buildParams(f: PurchasesReportFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.branchId) p.set("branchId", f.branchId);
  if (f.providerId) p.set("providerId", f.providerId);
  if (f.status) p.set("status", f.status);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  p.set("page", String(f.page));
  p.set("pageSize", String(f.pageSize));
  return p;
}

export async function getPurchasesReport(
  filters: PurchasesReportFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<PurchasesReportDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${PURCHASES_BASE}?${buildParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<PurchasesReportDto>;
}

export async function getProviderPaymentsReport(
  filters: ProviderPaymentsReportFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<ProviderPaymentsReportDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${PROVIDER_PAYMENTS_BASE}?${buildParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<ProviderPaymentsReportDto>;
}

async function downloadFormat(
  base: string,
  filters: PurchasesReportFilters,
  format: "pdf" | "xlsx",
  fetchImpl: typeof authFetch
): Promise<Blob> {
  const params = buildParams(filters);
  params.set("format", format);
  let res: Response;
  try {
    res = await fetchImpl(`${base}?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}

export async function downloadPurchasesPdf(f: PurchasesReportFilters, fetchImpl = authFetch): Promise<Blob> {
  return downloadFormat(PURCHASES_BASE, f, "pdf", fetchImpl);
}

export async function downloadPurchasesXlsx(f: PurchasesReportFilters, fetchImpl = authFetch): Promise<Blob> {
  return downloadFormat(PURCHASES_BASE, f, "xlsx", fetchImpl);
}

export async function downloadProviderPaymentsPdf(
  f: ProviderPaymentsReportFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(PROVIDER_PAYMENTS_BASE, f, "pdf", fetchImpl);
}

export async function downloadProviderPaymentsXlsx(
  f: ProviderPaymentsReportFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(PROVIDER_PAYMENTS_BASE, f, "xlsx", fetchImpl);
}
