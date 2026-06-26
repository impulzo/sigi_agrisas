export interface InvoiceItemProps {
  id: string;
  invoiceId: string;
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

export class InvoiceItem {
  readonly id!: string;
  readonly invoiceId!: string;
  readonly productId!: string | null;
  readonly productCodeSnapshot!: string;
  readonly productNameSnapshot!: string;
  readonly satProductCode!: string | null;
  readonly satUnitCode!: string | null;
  readonly unit!: string;
  readonly quantity!: number;
  readonly unitPrice!: number;
  readonly discountPct!: number | null;
  readonly ivaRate!: number;
  readonly iepsRate!: number;
  readonly taxObject!: string;
  readonly lineSubtotal!: number;
  readonly lineIva!: number;
  readonly lineIeps!: number;
  readonly lineTotal!: number;

  private constructor(props: InvoiceItemProps) {
    Object.assign(this, props);
  }

  static create(props: InvoiceItemProps): InvoiceItem {
    return new InvoiceItem(props);
  }
}
