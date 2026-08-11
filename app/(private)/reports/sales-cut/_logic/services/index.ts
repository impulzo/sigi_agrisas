import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import type { SalesCutReportDto } from "../types/api";
import type { SalesCutFilters } from "../types/domain";

const BASE = "/api/v1/admin/reports/sales-cut";

function buildParams(f: SalesCutFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.mode === "today") {
    p.set("preset", "today");
  } else {
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
  }
  if (f.branchId) p.set("branchId", f.branchId);
  if (f.cashierId) p.set("cashierId", f.cashierId);
  if (f.paymentMethodId) p.set("paymentMethodId", f.paymentMethodId);
  return p;
}

export async function getSalesCut(
  filters: SalesCutFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<SalesCutReportDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${buildParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<SalesCutReportDto>;
}

async function downloadFormat(
  filters: SalesCutFilters,
  format: "pdf" | "xlsx",
  fetchImpl: typeof authFetch
): Promise<Blob> {
  const params = buildParams(filters);
  params.set("format", format);
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}

export async function downloadSalesCutPdf(filters: SalesCutFilters, fetchImpl = authFetch): Promise<Blob> {
  return downloadFormat(filters, "pdf", fetchImpl);
}

export async function downloadSalesCutXlsx(filters: SalesCutFilters, fetchImpl = authFetch): Promise<Blob> {
  return downloadFormat(filters, "xlsx", fetchImpl);
}
