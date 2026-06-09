import { PaymentRepository, HistoryFilters, HistoryResult } from "../ports/PaymentRepository";

const PDF_ROW_LIMIT = 10_000;

export interface HistoryReportInput {
  filters: HistoryFilters;
  page: number;
  pageSize: number;
  forPdf: boolean;
}

export interface HistoryReportResult extends HistoryResult {
  tooLarge: boolean;
  page: number;
  pageSize: number;
}

export class GetPaymentHistoryReportUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  async execute(input: HistoryReportInput): Promise<HistoryReportResult> {
    if (input.forPdf) {
      const result = await this.repo.findHistory(input.filters);
      const tooLarge = result.total > PDF_ROW_LIMIT;
      return { ...result, tooLarge, page: 1, pageSize: result.total };
    }

    const result = await this.repo.findHistory(input.filters, {
      page: input.page,
      pageSize: input.pageSize,
    });
    return { ...result, tooLarge: false, page: input.page, pageSize: input.pageSize };
  }
}
