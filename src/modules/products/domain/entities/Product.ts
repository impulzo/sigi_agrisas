export interface ProductProps {
  id: string;
  code: string;
  name: string;
  unit: string;
  satProductCode: string | null;
  departmentId: string;
  ivaRate: number | null;
  iepsRate: number | null;
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
  readonly ivaRate: number | null;
  readonly iepsRate: number | null;
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
    this.ivaRate = props.ivaRate;
    this.iepsRate = props.iepsRate;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: ProductProps): Product {
    return new Product(props);
  }
}
