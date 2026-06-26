export interface FacturamaReceiverInput {
  rfc: string;
  name: string;
  cfdiUse: string;
  fiscalRegime: string;
  taxZipCode: string;
}

export interface FacturamaItemTaxInput {
  type: "IVA" | "IEPS";
  rate: number;
  base: number;
  total: number;
  isRetention: boolean;
}

export interface FacturamaItemInput {
  productCode: string;
  identificationNumber?: string;
  description: string;
  unit: string;
  satUnitCode: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  subtotal: number;
  taxes: FacturamaItemTaxInput[];
  taxObject: string;
  total: number;
}

export interface FacturамаStampInput {
  series?: string;
  currency: string;
  paymentForm: string;
  paymentMethod: string;
  expeditionPlace: string;
  cfdiType: string;
  receiver: FacturamaReceiverInput;
  items: FacturamaItemInput[];
}

export interface FacturamaStampResult {
  cfdiId: string;
  uuid: string;
  xmlUrl?: string;
  pdfUrl?: string;
}

export interface FacturamaCancelResult {
  success: boolean;
  acuseBase64?: string;
}

export interface FacturamaDownloadResult {
  contentBase64: string;
  contentType: string;
}

export interface FacturamaCsdInput {
  rfc: string;
  certificateBase64: string;
  privateKeyBase64: string;
  privateKeyPassword: string;
}

export interface FacturamaCsdStatus {
  rfc: string;
  issuer?: string;
  expiresAt?: string;
  isValid?: boolean;
}

export interface FacturamaGateway {
  stamp(input: FacturамаStampInput): Promise<FacturamaStampResult>;
  cancel(cfdiId: string, motive: string, uuidReplacement?: string | null): Promise<FacturamaCancelResult>;
  download(format: "pdf" | "xml", cfdiId: string): Promise<FacturamaDownloadResult>;
  uploadCsd(input: FacturamaCsdInput): Promise<FacturamaCsdStatus>;
  getCsdStatus(rfc?: string): Promise<FacturamaCsdStatus>;
}
