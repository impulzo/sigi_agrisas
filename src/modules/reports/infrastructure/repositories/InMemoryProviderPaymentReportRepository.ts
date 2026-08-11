import {
  ProviderPaymentReportRepository,
  ProviderPaymentsReportFilters,
  ProviderPaymentsReportRow,
} from "../../application/ports/ProviderPaymentReportRepository";

export interface InMemProviderPayment extends ProviderPaymentsReportRow {
  branchId: string;
  providerId: string;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export class InMemoryProviderPaymentReportRepository implements ProviderPaymentReportRepository {
  constructor(private readonly payments: InMemProviderPayment[]) {}

  async findAll(
    filters: ProviderPaymentsReportFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<{ items: ProviderPaymentsReportRow[]; total: number }> {
    const to = filters.to ? endOfDay(filters.to) : null;

    const matches = this.payments
      .filter((p) => !filters.branchId || p.branchId === filters.branchId)
      .filter((p) => !filters.providerId || p.providerId === filters.providerId)
      .filter((p) => !filters.status || p.status === filters.status)
      .filter((p) => !filters.from || p.paidAt >= filters.from)
      .filter((p) => !to || p.paidAt <= to)
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());

    const start = (pagination.page - 1) * pagination.pageSize;
    const items = matches
      .slice(start, start + pagination.pageSize)
      .map(({ branchId: _branchId, providerId: _providerId, ...row }) => row);

    return { items, total: matches.length };
  }
}
