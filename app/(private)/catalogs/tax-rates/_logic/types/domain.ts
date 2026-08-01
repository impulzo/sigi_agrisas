export interface TaxRate {
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
