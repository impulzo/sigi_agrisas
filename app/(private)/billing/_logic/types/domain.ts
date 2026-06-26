import type { InvoiceStatus } from "./api";

export type { InvoiceStatus };

export type CancellationMotive = "01" | "02" | "03" | "04";

export interface InvoiceItem {
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

export interface Invoice {
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
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: InvoiceItem[];
}

export interface InvoiceFilters {
  page: number;
  pageSize: number;
  status?: InvoiceStatus;
  branchId?: string;
  from?: string;
  to?: string;
  search: string;
}

export interface PartialLine {
  _key: string;
  productId: string | null;
  productCode: string;
  description: string;
  satProductCode: string;
  satUnitCode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  ivaRate: number;
  iepsRate: number;
}
