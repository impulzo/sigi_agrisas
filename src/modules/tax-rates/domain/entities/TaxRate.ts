export interface TaxRateProps {
  id: string;
  code: string;
  name: string;
  description: string | null;
  rate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TaxRate {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly rate: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: TaxRateProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.description = props.description;
    this.rate = props.rate;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: TaxRateProps): TaxRate {
    return new TaxRate(props);
  }
}
