import { authFetch, NetworkError } from "../../../../_lib/authFetch";

export async function downloadQuotePdf(id: string, fetchImpl = authFetch): Promise<Blob> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/quotes/${id}?format=pdf`);
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}
