export function formatPdfCurrency(amount: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
}
