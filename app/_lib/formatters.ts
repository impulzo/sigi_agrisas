export function formatDate(date: Date | string, locale = "es-CO"): string {
  return new Date(date).toLocaleDateString(locale);
}

export function formatNumber(value: number, locale = "es-CO"): string {
  return new Intl.NumberFormat(locale).format(value);
}
