import { PaymentReportRepository, RawPaymentRow } from "../../application/ports/PaymentReportRepository";
import { PaymentReportFilters } from "../../domain/value-objects/PaymentReportFilters";

export class InMemoryPaymentReportRepository implements PaymentReportRepository {
  constructor(private readonly rows: RawPaymentRow[]) {}

  async findPayments(filters: PaymentReportFilters): Promise<RawPaymentRow[]> {
    return this.rows.filter((row) => {
      if (filters.branchId && row.branchId !== filters.branchId) return false;
      if (filters.customerId && row.customerId !== filters.customerId) return false;
      if (filters.startDate && row.paymentDate < filters.startDate) return false;
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        if (row.paymentDate > endOfDay) return false;
      }
      return true;
    });
  }
}
