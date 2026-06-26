export interface ProductProps {
  id: string;
  code: string;
  name: string;
  unit: string;
  satProductCode: string | null;
  departmentId: string;
  taxRateId: string | null;
  ivaRate: number | null;
  iepsRate: number | null;
  imageUrl: string | null;
  isTaxable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Product {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly satProductCode: string | null;
  readonly departmentId: string;
  readonly taxRateId: string | null;
  readonly ivaRate: number | null;
  readonly iepsRate: number | null;
  readonly imageUrl: string | null;
  readonly isTaxable: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ProductProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.unit = props.unit;
    this.satProductCode = props.satProductCode;
    this.departmentId = props.departmentId;
    this.taxRateId = props.taxRateId;
    this.ivaRate = props.ivaRate;
    this.iepsRate = props.iepsRate;
    this.imageUrl = props.imageUrl;
    this.isTaxable = props.isTaxable;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: ProductProps): Product {
    return new Product(props);
  }
}
