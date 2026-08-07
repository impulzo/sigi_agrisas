import { PurchaseStatus, canBeCancelled } from "../value-objects/PurchaseStatus";
import { PurchasePaymentStatus } from "../value-objects/PurchasePaymentStatus";
import { PurchaseItem } from "./PurchaseItem";

export interface PurchaseProps {
  id?: string;
  providerId: string;
  branchId: string;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  paymentMethodId: string;
  creatorId: string;
  status?: PurchaseStatus;
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount?: number;
  paymentStatus?: PurchasePaymentStatus;
  notes: string | null;
  purchasedAt?: Date;
  satUuid?: string | null;
  supplierInvoiceNumber?: string | null;
  invoiceDate?: Date | null;
  xmlFileName?: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  items?: PurchaseItem[];
}

export class Purchase {
  readonly id: string;
  readonly providerId: string;
  readonly branchId: string;
  readonly folioId: string;
  readonly folioNumber: number;
  readonly folioCode: string;
  readonly paymentMethodId: string;
  readonly creatorId: string;
  readonly status: PurchaseStatus;
  readonly subtotal: number;
  readonly taxTotal: number;
  readonly total: number;
  readonly paidAmount: number;
  readonly paymentStatus: PurchasePaymentStatus;
  readonly notes: string | null;
  readonly purchasedAt: Date;
  readonly satUuid: string | null;
  readonly supplierInvoiceNumber: string | null;
  readonly invoiceDate: Date | null;
  readonly xmlFileName: string | null;
  readonly cancelledAt: Date | null;
  readonly cancelledBy: string | null;
  readonly cancellationReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly items: PurchaseItem[];

  private constructor(props: Required<PurchaseProps> & { id: string }) {
    this.id = props.id;
    this.providerId = props.providerId;
    this.branchId = props.branchId;
    this.folioId = props.folioId;
    this.folioNumber = props.folioNumber;
    this.folioCode = props.folioCode;
    this.paymentMethodId = props.paymentMethodId;
    this.creatorId = props.creatorId;
    this.status = props.status;
    this.subtotal = props.subtotal;
    this.taxTotal = props.taxTotal;
    this.total = props.total;
    this.paidAmount = props.paidAmount;
    this.paymentStatus = props.paymentStatus;
    this.notes = props.notes;
    this.purchasedAt = props.purchasedAt;
    this.satUuid = props.satUuid ?? null;
    this.supplierInvoiceNumber = props.supplierInvoiceNumber ?? null;
    this.invoiceDate = props.invoiceDate ?? null;
    this.xmlFileName = props.xmlFileName ?? null;
    this.cancelledAt = props.cancelledAt;
    this.cancelledBy = props.cancelledBy;
    this.cancellationReason = props.cancellationReason;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.items = props.items;
  }

  canBeCancelled(): boolean {
    return canBeCancelled(this.status);
  }

  static create(props: PurchaseProps): Purchase {
    const { randomUUID } = require("crypto");
    const now = new Date();
    return new Purchase({
      id: props.id ?? randomUUID(),
      providerId: props.providerId,
      branchId: props.branchId,
      folioId: props.folioId,
      folioNumber: props.folioNumber,
      folioCode: props.folioCode,
      paymentMethodId: props.paymentMethodId,
      creatorId: props.creatorId,
      status: props.status ?? "completed",
      subtotal: props.subtotal,
      taxTotal: props.taxTotal,
      total: props.total,
      paidAmount: props.paidAmount ?? 0,
      paymentStatus: props.paymentStatus ?? "paid",
      notes: props.notes,
      purchasedAt: props.purchasedAt ?? now,
      satUuid: props.satUuid ?? null,
      supplierInvoiceNumber: props.supplierInvoiceNumber ?? null,
      invoiceDate: props.invoiceDate ?? null,
      xmlFileName: props.xmlFileName ?? null,
      cancelledAt: props.cancelledAt,
      cancelledBy: props.cancelledBy,
      cancellationReason: props.cancellationReason,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
      items: props.items ?? [],
    });
  }
}
