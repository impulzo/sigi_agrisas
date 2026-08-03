export interface PurchaseItemProps {
  id?: string;
  purchaseId: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  quantity: number;
  unitCost: number;
  discountPct: number | null;
  ivaRate: number | null;
  iepsRate: number | null;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export class PurchaseItem {
  readonly id: string;
  readonly purchaseId: string;
  readonly productId: string;
  readonly productCodeSnapshot: string;
  readonly productNameSnapshot: string;
  readonly quantity: number;
  readonly unitCost: number;
  readonly discountPct: number | null;
  readonly ivaRate: number | null;
  readonly iepsRate: number | null;
  readonly lineSubtotal: number;
  readonly lineTax: number;
  readonly lineTotal: number;

  private constructor(props: Required<PurchaseItemProps> & { id: string }) {
    this.id = props.id;
    this.purchaseId = props.purchaseId;
    this.productId = props.productId;
    this.productCodeSnapshot = props.productCodeSnapshot;
    this.productNameSnapshot = props.productNameSnapshot;
    this.quantity = props.quantity;
    this.unitCost = props.unitCost;
    this.discountPct = props.discountPct;
    this.ivaRate = props.ivaRate;
    this.iepsRate = props.iepsRate;
    this.lineSubtotal = props.lineSubtotal;
    this.lineTax = props.lineTax;
    this.lineTotal = props.lineTotal;
  }

  static create(props: PurchaseItemProps): PurchaseItem {
    if (props.quantity <= 0) {
      throw new Error("PurchaseItem quantity must be > 0");
    }
    if (props.unitCost < 0) {
      throw new Error("PurchaseItem unitCost must be >= 0");
    }
    const { randomUUID } = require("crypto");
    return new PurchaseItem({ ...props, id: props.id ?? randomUUID() });
  }
}
