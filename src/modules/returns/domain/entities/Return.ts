import { ReturnStatus, canBeCancelled } from "../value-objects/ReturnStatus";

export interface ReturnProps {
  id?: string;
  saleId: string;
  branchId: string;
  customerId: string | null;
  creatorId: string;
  status?: ReturnStatus;
  reason: string;
  returnedAt: Date;
  refundSubtotal?: number;
  refundTax?: number;
  refundTotal?: number;
  notes: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Return {
  readonly id: string;
  readonly saleId: string;
  readonly branchId: string;
  readonly customerId: string | null;
  readonly creatorId: string;
  readonly status: ReturnStatus;
  readonly reason: string;
  readonly returnedAt: Date;
  readonly refundSubtotal: number;
  readonly refundTax: number;
  readonly refundTotal: number;
  readonly notes: string | null;
  readonly cancelledAt: Date | null;
  readonly cancelledBy: string | null;
  readonly cancellationReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: Required<ReturnProps> & { id: string }) {
    this.id = props.id;
    this.saleId = props.saleId;
    this.branchId = props.branchId;
    this.customerId = props.customerId;
    this.creatorId = props.creatorId;
    this.status = props.status;
    this.reason = props.reason;
    this.returnedAt = props.returnedAt;
    this.refundSubtotal = props.refundSubtotal;
    this.refundTax = props.refundTax;
    this.refundTotal = props.refundTotal;
    this.notes = props.notes;
    this.cancelledAt = props.cancelledAt;
    this.cancelledBy = props.cancelledBy;
    this.cancellationReason = props.cancellationReason;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  canBeCancelled(): boolean {
    return canBeCancelled(this.status);
  }

  static create(props: ReturnProps): Return {
    const { randomUUID } = require("crypto");
    const now = new Date();
    return new Return({
      id: props.id ?? randomUUID(),
      saleId: props.saleId,
      branchId: props.branchId,
      customerId: props.customerId,
      creatorId: props.creatorId,
      status: props.status ?? "completed",
      reason: props.reason,
      returnedAt: props.returnedAt,
      refundSubtotal: props.refundSubtotal ?? 0,
      refundTax: props.refundTax ?? 0,
      refundTotal: props.refundTotal ?? 0,
      notes: props.notes,
      cancelledAt: props.cancelledAt,
      cancelledBy: props.cancelledBy,
      cancellationReason: props.cancellationReason,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }
}
