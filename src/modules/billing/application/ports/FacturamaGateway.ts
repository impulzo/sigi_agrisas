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

export interface FacturamaStampInput {
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

export interface FacturamaInvoiceSnapshotItem {
  description: string;
  productCode: string;
  satProductCode?: string | null;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  ivaRate: number;
  iepsRate: number;
  lineSubtotal: number;
  lineTotal: number;
}

// The already-stamped invoice's own persisted data — same source of truth the
// detail page reads. Passed to `download` so a re-download always renders the
// exact numbers shown on screen, never a gateway's own (possibly stale or
// process-local) reconstruction. The real Facturama gateway ignores it: the
// stamped document on Facturama's servers is already the source of truth.
export interface FacturamaInvoiceSnapshot {
  uuid: string;
  issuer: {
    rfc: string | null;
    legalName: string | null;
    fiscalRegime: string | null;
    zipCode: string | null;
    address: string | null;
    branchName?: string | null;
  };
  receiver: FacturamaReceiverInput;
  items: FacturamaInvoiceSnapshotItem[];
  paymentForm: string;
  paymentMethod: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  total: number;
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
  stamp(input: FacturamaStampInput): Promise<FacturamaStampResult>;
  cancel(cfdiId: string, motive: string, uuidReplacement?: string | null): Promise<FacturamaCancelResult>;
  download(format: "pdf" | "xml", cfdiId: string, snapshot?: FacturamaInvoiceSnapshot): Promise<FacturamaDownloadResult>;
  uploadCsd(input: FacturamaCsdInput): Promise<FacturamaCsdStatus>;
  getCsdStatus(rfc?: string): Promise<FacturamaCsdStatus>;
}
