import { PaymentRepository, SaleTotals, PaymentListRow } from "../ports/PaymentRepository";

export interface LineBalanceDto {
  saleItemId: string;
  productNameSnapshot: string;
  lineTotal: string;
  paidAmount: string;
  dueAmount: string;
}

export interface ListPaymentsBySaleResult {
  items: PaymentListRow[];
  saleId: string;
  saleTotal: string;
  salePaidAmount: string;
  salePaymentStatus: string;
  saleDueAmount: string;
  lineBalances: LineBalanceDto[];
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
        lineBalances: saleTotals.lineBalances.map((lb) => ({
          saleItemId: lb.saleItemId,
          productNameSnapshot: lb.productNameSnapshot,
          lineTotal: lb.lineTotal.toFixed(4),
          paidAmount: lb.paidAmount.toFixed(4),
          dueAmount: lb.dueAmount.toFixed(4),
        })),
      },
      branchId: saleTotals.saleBranchId,
    };
  }
}
