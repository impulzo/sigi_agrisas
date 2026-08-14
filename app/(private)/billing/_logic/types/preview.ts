export interface InvoicePreviewLine {
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

export interface InvoicePreviewData {
  issuer: {
    name: string;
    branchName?: string | null;
  };
  receiver: {
    rfc: string;
    name: string;
    cfdiUse: string;
    fiscalRegime: string;
    taxZipCode: string;
  };
  lines: InvoicePreviewLine[];
  paymentForm: string;
  paymentMethod: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
}
