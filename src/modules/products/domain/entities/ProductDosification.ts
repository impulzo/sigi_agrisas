export interface ProductDosificationProps {
  id: string;
  productId: string;
  name: string;
  numParts: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductDosification {
  readonly id: string;
  readonly productId: string;
  readonly name: string;
  readonly numParts: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ProductDosificationProps) {
    this.id = props.id;
    this.productId = props.productId;
    this.name = props.name;
    this.numParts = props.numParts;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: ProductDosificationProps): ProductDosification {
    return new ProductDosification(props);
  }
}
