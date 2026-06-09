import { PaymentRepository, SaleTotals, PaymentListRow } from "../ports/PaymentRepository";

export interface ListPaymentsBySaleResult {
  items: PaymentListRow[];
  saleId: string;
  saleTotal: string;
  salePaidAmount: string;
  salePaymentStatus: string;
  saleDueAmount: string;
}

export class ListPaymentsBySaleUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  async execute(saleId: string): Promise<{ result: ListPaymentsBySaleResult; branchId: string }> {
    const { items, saleTotals } = await this.repo.listBySale(saleId);
    const due = saleTotals.saleTotal - saleTotals.salePaidAmount;

    return {
      result: {
        items,
        saleId,
        saleTotal: saleTotals.saleTotal.toFixed(4),
        salePaidAmount: saleTotals.salePaidAmount.toFixed(4),
        salePaymentStatus: saleTotals.salePaymentStatus,
        saleDueAmount: due.toFixed(4),
      },
      branchId: saleTotals.saleBranchId,
    };
  }
}
