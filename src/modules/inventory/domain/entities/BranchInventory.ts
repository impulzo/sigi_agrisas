export interface BranchInventoryProps {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  reorderPoint: number;
  updatedAt: Date;
}

export class BranchInventory {
  readonly id: string;
  readonly branchId: string;
  readonly productId: string;
  readonly quantity: number;
  readonly reservedQuantity: number;
  readonly reorderPoint: number;
  readonly updatedAt: Date;

  private constructor(props: BranchInventoryProps) {
    this.id = props.id;
    this.branchId = props.branchId;
    this.productId = props.productId;
    this.quantity = props.quantity;
    this.reservedQuantity = props.reservedQuantity;
    this.reorderPoint = props.reorderPoint;
    this.updatedAt = props.updatedAt;
  }

  static create(props: BranchInventoryProps): BranchInventory {
    return new BranchInventory(props);
  }
}
