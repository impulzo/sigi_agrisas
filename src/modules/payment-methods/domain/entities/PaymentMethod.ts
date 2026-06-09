export interface PaymentMethodProps {
  code: string;
  name: string;
  description: string | null;
  isCredit: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentMethod {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly isCredit: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(id: string, props: PaymentMethodProps) {
    this.id = id;
    this.code = props.code;
    this.name = props.name;
    this.description = props.description;
    this.isCredit = props.isCredit;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(id: string, props: PaymentMethodProps): PaymentMethod {
    return new PaymentMethod(id, props);
  }
}
