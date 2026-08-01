export interface TaxRateProps {
  id: string;
  code: string;
  name: string;
  description: string | null;
  satTaxCode: string;
  factorType: string;
  displayValue: number;
  rate: number;
  transferredAccount: string | null;
  pendingTransferredAccount: string | null;
  creditedAccount: string | null;
  pendingCreditedAccount: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TaxRate {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly satTaxCode: string;
  readonly factorType: string;
  readonly displayValue: number;
  readonly rate: number;
  readonly transferredAccount: string | null;
  readonly pendingTransferredAccount: string | null;
  readonly creditedAccount: string | null;
  readonly pendingCreditedAccount: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: TaxRateProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.description = props.description;
    this.satTaxCode = props.satTaxCode;
    this.factorType = props.factorType;
    this.displayValue = props.displayValue;
    this.rate = props.rate;
    this.transferredAccount = props.transferredAccount;
    this.pendingTransferredAccount = props.pendingTransferredAccount;
    this.creditedAccount = props.creditedAccount;
    this.pendingCreditedAccount = props.pendingCreditedAccount;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: TaxRateProps): TaxRate {
    return new TaxRate(props);
  }
}
