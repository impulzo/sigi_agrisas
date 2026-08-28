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
    name: string | null;
    branchName?: string | null;
    rfc?: string | null;
    fiscalRegime?: string | null;
    zipCode?: string | null;
    address?: string | null;
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
