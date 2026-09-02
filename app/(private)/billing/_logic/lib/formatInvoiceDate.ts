export function formatInvoiceDate(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(d) : "—";
}
