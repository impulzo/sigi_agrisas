import { PaymentRepository, ListPaymentsFilters, ListPaymentsPagination, PaymentListRow } from "../ports/PaymentRepository";

export interface ListPaymentsResult {
  items: PaymentListRow[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListPaymentsUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  async execute(
    filters: ListPaymentsFilters,
    pagination: ListPaymentsPagination
  ): Promise<ListPaymentsResult> {
    const { items, total } = await this.repo.list(filters, pagination);
    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }
}
