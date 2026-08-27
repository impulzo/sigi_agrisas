export interface SatCatalogEntry {
  code: string;
  description: string;
}

export const SAT_PAYMENT_FORMS: SatCatalogEntry[] = [
  { code: "01", description: "Efectivo" },
  { code: "03", description: "Transferencia" },
  { code: "04", description: "Tarjeta de crédito" },
  { code: "28", description: "Tarjeta de débito" },
  { code: "99", description: "Por definir" },
];

export const SAT_PAYMENT_METHODS: SatCatalogEntry[] = [
  { code: "PUE", description: "Pago en una exhibición" },
  { code: "PPD", description: "Pago en parcialidades o diferido" },
];

function describe(catalog: SatCatalogEntry[], code: string): string {
  const entry = catalog.find((e) => e.code === code);
  return entry ? `${entry.code} - ${entry.description}` : code;
}

export function describePaymentForm(code: string): string {
  return describe(SAT_PAYMENT_FORMS, code);
}

export function describePaymentMethod(code: string): string {
  return describe(SAT_PAYMENT_METHODS, code);
}
