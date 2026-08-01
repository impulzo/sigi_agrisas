import { ProviderPaymentStatus } from "../value-objects/ProviderPaymentStatus";

export interface ProviderPaymentProps {
  purchaseId: string;
  providerId: string;
  branchId: string;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  creatorId: string;
  amount: number;
  status: ProviderPaymentStatus;
  notes: string | null;
  paidAt: Date;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
}

export class ProviderPayment {
  readonly id: string;
  readonly purchaseId: string;
  readonly providerId: string;
  readonly branchId: string;
  readonly folioId: string;
  readonly folioNumber: number;
  readonly folioCode: string;
  readonly creatorId: string;
  readonly amount: number;
  readonly status: ProviderPaymentStatus;
  readonly notes: string | null;
  readonly paidAt: Date;
  readonly cancelledAt: Date | null;
  readonly cancelledBy: string | null;
  readonly cancellationReason: string | null;

  private constructor(id: string, props: ProviderPaymentProps) {
    this.id = id;
    this.purchaseId = props.purchaseId;
    this.providerId = props.providerId;
    this.branchId = props.branchId;
    this.folioId = props.folioId;
    this.folioNumber = props.folioNumber;
    this.folioCode = props.folioCode;
    this.creatorId = props.creatorId;
    this.amount = props.amount;
    this.status = props.status;
    this.notes = props.notes;
    this.paidAt = props.paidAt;
    this.cancelledAt = props.cancelledAt;
    this.cancelledBy = props.cancelledBy;
    this.cancellationReason = props.cancellationReason;
  }

  static create(id: string, props: ProviderPaymentProps): ProviderPayment {
    if (props.amount <= 0) {
      throw new Error("ProviderPayment amount must be > 0");
    }
    return new ProviderPayment(id, props);
  }
}
