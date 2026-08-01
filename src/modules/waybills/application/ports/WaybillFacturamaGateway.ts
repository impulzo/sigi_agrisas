export interface WaybillLocationInput {
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  neighborhood: string;
  municipality: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface WaybillMerchandiseInput {
  description: string;
  satBienesTranspCode: string;
  satUnitCode: string;
  quantity: number;
  weightKg: number;
  isHazardousMaterial: boolean;
  hazardousMaterialCode: string | null;
}

export interface WaybillAutotransporteInput {
  plate: string;
  config: string;
  permitType: string;
  permitNumber: string;
  insuranceCompany: string;
  insurancePolicy: string;
}

export interface WaybillFiguraTransporteInput {
  name: string;
  rfc: string | null;
  licenseNumber: string;
}

export interface StampTrasladoInput {
  origin: WaybillLocationInput;
  destination: WaybillLocationInput;
  merchandise: WaybillMerchandiseInput[];
  autotransporte: WaybillAutotransporteInput;
  figuraTransporte: WaybillFiguraTransporteInput;
  distanceKm: number;
}

export interface StampTrasladoResult {
  cfdiId: string;
  uuid: string;
  xmlUrl?: string;
  pdfUrl?: string;
}

export interface WaybillCancelResult {
  success: boolean;
  acuseBase64?: string;
}

export interface WaybillDownloadResult {
  contentBase64: string;
  contentType: string;
}

/**
 * Module-local Facturama port for CFDI Traslado + Complemento Carta Porte.
 * Deliberately independent of `src/modules/billing/`'s FacturamaGateway — a
 * waybill is fiscally distinct from an invoice (no taxes, no monetary value,
 * Receiver is the emitter itself). See add-carta-porte/design.md D3.
 */
export interface WaybillFacturamaGateway {
  stampTraslado(input: StampTrasladoInput): Promise<StampTrasladoResult>;
  cancel(cfdiId: string, motive: string): Promise<WaybillCancelResult>;
  download(format: "pdf" | "xml", cfdiId: string): Promise<WaybillDownloadResult>;
}
