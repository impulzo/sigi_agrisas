import { authFetch, NetworkError } from "../../../../_lib/authFetch";

export async function downloadInvoiceFile(
  id: string,
  format: "pdf" | "xml",
  fetchImpl = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/invoices/${id}/download?format=${format}`);
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filenameMatch = /filename="?([^";]+)"?/.exec(disposition);
  const filename = filenameMatch?.[1] ?? `factura-${id.slice(-8)}.${format}`;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
