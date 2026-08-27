import { authFetch, NetworkError } from "../../../../_lib/authFetch";

interface SatCode {
  code: string;
  description: string;
}

async function search(path: string, code: string, fetchImpl: typeof authFetch): Promise<SatCode[]> {
  const res = await fetchImpl(`/api/v1/admin/sat-codes/${path}?search=${encodeURIComponent(code)}`);
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as { items: SatCode[] };
  return body.items;
}

async function resolve(path: string, code: string, fetchImpl: typeof authFetch): Promise<string> {
  if (!code) return code;
  try {
    const items = await search(path, code, fetchImpl);
    const match = items.find((i) => i.code === code);
    return match ? `${match.code} - ${match.description}` : code;
  } catch {
    return code;
  }
}

export function resolveFiscalRegimeDescription(code: string, fetchImpl = authFetch): Promise<string> {
  return resolve("regimen-fiscal", code, fetchImpl);
}

export function resolveCfdiUseDescription(code: string, fetchImpl = authFetch): Promise<string> {
  return resolve("uso-cfdi", code, fetchImpl);
}
