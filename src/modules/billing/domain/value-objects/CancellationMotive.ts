export const CANCELLATION_MOTIVES = ["01", "02", "03", "04"] as const;
export type CancellationMotive = (typeof CANCELLATION_MOTIVES)[number];

export const CANCELLATION_MOTIVE_LABELS: Record<CancellationMotive, string> = {
  "01": "Comprobante emitido con errores con relación",
  "02": "Comprobante emitido con errores sin relación",
  "03": "No se llevó a cabo la operación",
  "04": "Operación nominativa relacionada en la factura global",
};

export function isValidCancellationMotive(value: string): value is CancellationMotive {
  return CANCELLATION_MOTIVES.includes(value as CancellationMotive);
}
