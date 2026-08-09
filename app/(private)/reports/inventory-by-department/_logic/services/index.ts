import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import type { DepartmentPriceListReportDto } from "../types/api";
import type { DepartmentPriceListFilters } from "../types/domain";

const BASE = "/api/v1/admin/reports/inventory/by-department";

function buildParams(f: DepartmentPriceListFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.departmentId) p.set("departmentId", f.departmentId);
  return p;
}

export async function getDepartmentPriceList(
  filters: DepartmentPriceListFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<DepartmentPriceListReportDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${buildParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<DepartmentPriceListReportDto>;
}

async function downloadFormat(
  filters: DepartmentPriceListFilters,
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

export async function downloadDepartmentPriceListPdf(
  filters: DepartmentPriceListFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(filters, "pdf", fetchImpl);
}

export async function downloadDepartmentPriceListXlsx(
  filters: DepartmentPriceListFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(filters, "xlsx", fetchImpl);
}
