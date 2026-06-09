export interface ProductPriceProps {
  id: string;
  productId: string;
  name: string;
  price: number;
  minQuantity: number;
  discountPct: number | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductPrice {
  readonly id: string;
  readonly productId: string;
  readonly name: string;
  readonly price: number;
  readonly minQuantity: number;
  readonly discountPct: number | null;
  readonly isDefault: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ProductPriceProps) {
    this.id = props.id;
    this.productId = props.productId;
    this.name = props.name;
    this.price = props.price;
    this.minQuantity = props.minQuantity;
    this.discountPct = props.discountPct;
    this.isDefault = props.isDefault;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: ProductPriceProps): ProductPrice {
    return new ProductPrice(props);
  }
}
