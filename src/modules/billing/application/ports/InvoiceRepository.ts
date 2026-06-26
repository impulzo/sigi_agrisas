import { Invoice } from "../../domain/entities/Invoice";

export interface ListInvoicesOptions {
  branchId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListInvoicesResult {
  items: Invoice[];
  total: number;
}

export interface CreateInvoiceData {
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
  creatorId: string;
  items: Array<{
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
  }>;
}

export interface InvoiceRepository {
  list(options: ListInvoicesOptions): Promise<ListInvoicesResult>;
  findById(id: string): Promise<Invoice | null>;
  findByIdWithItems(id: string): Promise<Invoice | null>;
  findBySale(saleId: string): Promise<Invoice[]>;
  findStampedBySale(saleId: string): Promise<Invoice | null>;
  createStamped(data: CreateInvoiceData): Promise<Invoice>;
  markCancelled(
    id: string,
    motive: string,
    cancelledBy: string,
    uuidReplacement?: string | null
  ): Promise<Invoice>;
}
