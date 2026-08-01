import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import type { CashCutReportDto } from "../types/api";
import type { CashCutFilters } from "../types/domain";

const BASE = "/api/v1/admin/reports/cash-cut";

function buildParams(f: CashCutFilters): URLSearchParams {
  const p = new URLSearchParams();
  p.set("from", f.from);
  p.set("to", f.to);
  if (f.branchId) p.set("branchId", f.branchId);
  if (f.customerId) p.set("customerId", f.customerId);
  if (f.paymentMethodId) p.set("paymentMethodId", f.paymentMethodId);
  return p;
}

export async function getCashCut(
  filters: CashCutFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<CashCutReportDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${buildParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<CashCutReportDto>;
}

async function downloadFormat(
  filters: CashCutFilters,
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

export async function downloadCashCutPdf(
  filters: CashCutFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(filters, "pdf", fetchImpl);
}

export async function downloadCashCutXlsx(
  filters: CashCutFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(filters, "xlsx", fetchImpl);
}
