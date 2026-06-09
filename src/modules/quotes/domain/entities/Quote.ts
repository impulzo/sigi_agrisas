import { QuoteItem } from "./QuoteItem";
import { QuoteStatus } from "../value-objects/QuoteStatus";

export interface QuoteProps {
  id: string;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  branchId: string;
  customerId: string | null;
  creatorId: string;
  status: QuoteStatus;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  expiresAt: Date | null;
  authorizedAt: Date | null;
  authorizedBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  convertedAt: Date | null;
  convertedSaleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: QuoteItem[];
}

export class Quote {
  readonly id: string;
  readonly folioId: string;
  readonly folioNumber: number;
  readonly folioCode: string;
  readonly branchId: string;
  readonly customerId: string | null;
  readonly creatorId: string;
  readonly status: QuoteStatus;
  readonly subtotal: number;
  readonly taxTotal: number;
  readonly total: number;
  readonly notes: string | null;
  readonly expiresAt: Date | null;
  readonly authorizedAt: Date | null;
  readonly authorizedBy: string | null;
  readonly cancelledAt: Date | null;
  readonly cancellationReason: string | null;
  readonly convertedAt: Date | null;
  readonly convertedSaleId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly items: QuoteItem[];

  private constructor(props: QuoteProps) {
    this.id = props.id;
    this.folioId = props.folioId;
    this.folioNumber = props.folioNumber;
    this.folioCode = props.folioCode;
    this.branchId = props.branchId;
    this.customerId = props.customerId;
    this.creatorId = props.creatorId;
    this.status = props.status;
    this.subtotal = props.subtotal;
    this.taxTotal = props.taxTotal;
    this.total = props.total;
    this.notes = props.notes;
    this.expiresAt = props.expiresAt;
    this.authorizedAt = props.authorizedAt;
    this.authorizedBy = props.authorizedBy;
    this.cancelledAt = props.cancelledAt;
    this.cancellationReason = props.cancellationReason;
    this.convertedAt = props.convertedAt;
    this.convertedSaleId = props.convertedSaleId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.items = props.items;
  }

  static create(props: QuoteProps): Quote {
    return new Quote(props);
  }

  /** Pure helper — does the persisted state count as "expired" right now? */
  isExpiredNow(now: Date = new Date()): boolean {
    if (this.status === "expired") return true;
    if (this.status === "authorized" && this.expiresAt !== null && this.expiresAt < now) {
      return true;
    }
    return false;
  }
}
