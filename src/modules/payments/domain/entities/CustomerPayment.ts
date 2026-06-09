import { PaymentStatus } from "../value-objects/PaymentStatus";

export interface CustomerPaymentProps {
  saleId: string;
  customerId: string;
  userId: string;
  branchId: string;
  paymentMethodId: string;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  amount: number;
  status: PaymentStatus;
  notes: string | null;
  createdAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
}

export class CustomerPayment {
  readonly id: string;
  readonly saleId: string;
  readonly customerId: string;
  readonly userId: string;
  readonly branchId: string;
  readonly paymentMethodId: string;
  readonly folioId: string;
  readonly folioNumber: number;
  readonly folioCode: string;
  readonly amount: number;
  readonly status: PaymentStatus;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly cancelledAt: Date | null;
  readonly cancellationReason: string | null;

  private constructor(id: string, props: CustomerPaymentProps) {
    this.id = id;
    this.saleId = props.saleId;
    this.customerId = props.customerId;
    this.userId = props.userId;
    this.branchId = props.branchId;
    this.paymentMethodId = props.paymentMethodId;
    this.folioId = props.folioId;
    this.folioNumber = props.folioNumber;
    this.folioCode = props.folioCode;
    this.amount = props.amount;
    this.status = props.status;
    this.notes = props.notes;
    this.createdAt = props.createdAt;
    this.cancelledAt = props.cancelledAt;
    this.cancellationReason = props.cancellationReason;
  }

  static create(id: string, props: CustomerPaymentProps): CustomerPayment {
    if (props.amount <= 0) {
      throw new Error("Payment amount must be > 0");
    }
    return new CustomerPayment(id, props);
  }
}
