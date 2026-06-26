import { InvoiceItem } from "./InvoiceItem";

export type InvoiceStatus = "stamped" | "cancelled";

export interface InvoiceProps {
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
  creatorId: string;
  cancellationMotive: string | null;
  uuidReplacement: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: InvoiceItem[];
}

export class Invoice {
  readonly id!: string;
  readonly uuid!: string | null;
  readonly facturamaCfdiId!: string | null;
  readonly status!: InvoiceStatus;
  readonly cfdiType!: string;
  readonly cfdiUse!: string;
  readonly paymentForm!: string;
  readonly paymentMethod!: string;
  readonly receiverRfc!: string;
  readonly receiverName!: string;
  readonly receiverCfdiUse!: string;
  readonly receiverFiscalRegime!: string;
  readonly receiverTaxZipCode!: string;
  readonly currency!: string;
  readonly subtotal!: number;
  readonly taxTotal!: number;
  readonly total!: number;
  readonly xmlUrl!: string | null;
  readonly pdfUrl!: string | null;
  readonly saleId!: string | null;
  readonly branchId!: string;
  readonly customerId!: string | null;
  readonly creatorId!: string;
  readonly cancellationMotive!: string | null;
  readonly uuidReplacement!: string | null;
  readonly cancelledAt!: Date | null;
  readonly cancelledBy!: string | null;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
  readonly items!: InvoiceItem[];

  private constructor(props: InvoiceProps) {
    Object.assign(this, props);
  }

  static create(props: InvoiceProps): Invoice {
    return new Invoice(props);
  }

  isStamped(): boolean {
    return this.status === "stamped";
  }

  isCancelled(): boolean {
    return this.status === "cancelled";
  }
}
