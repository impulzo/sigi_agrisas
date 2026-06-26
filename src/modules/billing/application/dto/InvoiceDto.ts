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
  status: string;
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

// --- Request types ---

export interface StampInvoiceFromSaleRequest {
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

export interface StampStandaloneInvoiceRequest {
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
  motive: string;
  uuidReplacement?: string | null;
}

export interface UploadCsdRequest {
  rfc: string;
  certificateBase64: string;
  privateKeyBase64: string;
  privateKeyPassword: string;
}
