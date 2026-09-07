export interface EmitterFiscalData {
  rfc: string;
  legalName: string;
  fiscalRegime: string;
  zipCode: string;
  address: string;
}

export type PartialEmitterFiscalData = Partial<EmitterFiscalData>;

/**
 * Port sobre la captura local de datos fiscales del emisor (`/billing/csd`),
 * separado del `FacturamaGateway` (que expone el estado del CSD en Facturama,
 * no estos campos). Aísla a `resolveIssuerFiscalData`/`UploadCsdUseCase`/
 * `GetCsdStatusUseCase` de la implementación de infraestructura concreta.
 */
export interface EmitterFiscalSettingsStore {
  get(): Promise<PartialEmitterFiscalData | null>;
  upsert(data: PartialEmitterFiscalData): Promise<void>;
}
