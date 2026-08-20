import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { InvoicePreviewData } from "../types/preview";

export async function downloadInvoicePreviewPdf(
  data: InvoicePreviewData,
  fetchImpl = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/invoices/preview/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "factura-borrador.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
