import { SaleItem } from "./SaleItem";

export type SaleStatus = "completed" | "cancelled" | "edited" | "returned_total";

export interface SaleProps {
  id: string;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  branchId: string;
  customerId: string | null;
  cashierId: string;
  paymentMethodId: string;
  quoteId: string | null;
  status: SaleStatus;
  paidAmount: number;
  paymentStatus: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: SaleItem[];
}

export class Sale {
  readonly id: string;
  readonly folioId: string;
  readonly folioNumber: number;
  readonly folioCode: string;
  readonly branchId: string;
  readonly customerId: string | null;
  readonly cashierId: string;
  readonly paymentMethodId: string;
  readonly quoteId: string | null;
  readonly status: SaleStatus;
  readonly paidAmount: number;
  readonly paymentStatus: string;
  readonly subtotal: number;
  readonly taxTotal: number;
  readonly total: number;
  readonly notes: string | null;
  readonly completedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly cancellationReason: string | null;
  readonly editedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly items: SaleItem[];

  private constructor(props: SaleProps) {
    this.id = props.id;
    this.folioId = props.folioId;
    this.folioNumber = props.folioNumber;
    this.folioCode = props.folioCode;
    this.branchId = props.branchId;
    this.customerId = props.customerId;
    this.cashierId = props.cashierId;
    this.paymentMethodId = props.paymentMethodId;
    this.quoteId = props.quoteId;
    this.status = props.status;
    this.paidAmount = props.paidAmount;
    this.paymentStatus = props.paymentStatus;
    this.subtotal = props.subtotal;
    this.taxTotal = props.taxTotal;
    this.total = props.total;
    this.notes = props.notes;
    this.completedAt = props.completedAt;
    this.cancelledAt = props.cancelledAt;
    this.cancellationReason = props.cancellationReason;
    this.editedAt = props.editedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.items = props.items;
  }

  static create(props: SaleProps): Sale {
    return new Sale(props);
  }
}
