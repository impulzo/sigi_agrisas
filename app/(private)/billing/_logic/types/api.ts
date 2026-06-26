export type InvoiceStatus = "stamped" | "cancelled";

export interface InvoiceItemDto {
  id: string;
  productId: string | null;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  satProductCode: string | null;
  satUnitCode: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPct: number | null;
  ivaRate: number;
  iepsRate: number;
  taxObject: string;
  lineSubtotal: number;
  lineIva: number;
  lineIeps: number;
  lineTotal: number;
}

export interface InvoiceDto {
  id: string;
  uuid: string | null;
  facturamaCfdiId: string | null;
  status: InvoiceStatus;
  cfdiType: string;
  cfdiUse: string;
  paymentForm: string;
  paymentMethod: string;
  receiverRfc: string;
  receiverName: string;
  receiverCfdiUse: string;
  receiverFiscalRegime: string;
  receiverTaxZipCode: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  xmlUrl: string | null;
  pdfUrl: string | null;
  saleId: string | null;
  branchId: string;
  customerId: string | null;
  cancellationMotive: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItemDto[];
}

export interface InvoiceListResponse {
  items: InvoiceDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StampFromSaleRequest {
  saleId: string;
  paymentForm?: string;
  paymentMethod?: string;
  cfdiUse?: string;
}

export interface StandaloneInvoiceItemInput {
  productId?: string | null;
  productCode: string;
  description: string;
  satProductCode?: string | null;
  satUnitCode?: string | null;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
}

export interface StampStandaloneRequest {
  branchId?: string | null;
  customer: {
    rfc: string;
    name: string;
    cfdiUse: string;
    fiscalRegime: string;
    taxZipCode: string;
  };
  items: StandaloneInvoiceItemInput[];
  paymentForm?: string;
  paymentMethod?: string;
}

export interface CancelInvoiceRequest {
  motive: "01" | "02" | "03" | "04";
  uuidReplacement?: string | null;
}

export interface UploadCsdRequest {
  rfc: string;
  certificateBase64: string;
  privateKeyBase64: string;
  privateKeyPassword: string;
}

export interface CsdStatusDto {
  rfc?: string;
  alias?: string;
  issuedAt?: string;
  expiresAt?: string;
  status?: string;
  [key: string]: unknown;
}

export interface ListInvoicesRequest {
  page?: number;
  pageSize?: number;
  branchId?: string;
  status?: InvoiceStatus;
  search?: string;
  from?: string;
  to?: string;
}
