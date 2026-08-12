import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import type { SalesByProductReportDto } from "../types/api";
import type { SalesByProductFilters } from "../types/domain";

const BASE = "/api/v1/admin/reports/sales-by-product";

function reportTooLarge(): Error {
  const e = new Error("El conjunto de datos supera 10,000 registros. Aplica más filtros.");
  e.name = "ReportTooLargeError";
  return e;
}

function buildParams(f: SalesByProductFilters): URLSearchParams {
  const p = new URLSearchParams();
  p.set("page", String(f.page));
  p.set("pageSize", String(f.pageSize));
  if (f.branchId) p.set("branchId", f.branchId);
  if (f.departmentId) p.set("departmentId", f.departmentId);
  if (f.customerId) p.set("customerId", f.customerId);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  return p;
}

export async function getSalesByProductReport(
  filters: SalesByProductFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<SalesByProductReportDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${buildParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<SalesByProductReportDto>;
}

async function downloadFormat(
  filters: SalesByProductFilters,
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
  if (res.status === 409) {
    const data = (await res.json()) as { error: string };
    if (data.error === "ReportTooLarge") throw reportTooLarge();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}

export async function downloadSalesByProductPdf(f: SalesByProductFilters, fetchImpl = authFetch): Promise<Blob> {
  return downloadFormat(f, "pdf", fetchImpl);
}

export async function downloadSalesByProductXlsx(f: SalesByProductFilters, fetchImpl = authFetch): Promise<Blob> {
  return downloadFormat(f, "xlsx", fetchImpl);
}
