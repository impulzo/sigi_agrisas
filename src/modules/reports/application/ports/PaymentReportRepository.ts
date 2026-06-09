import { Decimal } from "decimal.js";
import { PaymentReportFilters } from "../../domain/value-objects/PaymentReportFilters";

export interface RawPaymentRow {
  paymentId: string;
  folioNumber: string;
  saleId: string;
  saleFolioNumber: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  branchId: string;
  branchCode: string;
  amount: Decimal;
  paymentDate: Date;
  status: string;
  registeredBy: string;
  registeredByEmail: string;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
}

export interface PaymentReportRepository {
  findPayments(filters: PaymentReportFilters): Promise<RawPaymentRow[]>;
}
