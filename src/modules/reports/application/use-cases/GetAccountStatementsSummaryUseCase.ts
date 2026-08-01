import { Decimal } from "decimal.js";
import { AccountStatementRepository } from "../ports/AccountStatementRepository";
import {
  AccountStatementSummaryResponseDto,
  AccountStatementSummaryRowDto,
} from "../dto/AccountStatementSummaryResponseDto";

export interface GetAccountStatementsSummaryRequest {
  branchId: string | null;
  search: string | null;
  from: Date | null;
  to: Date | null;
  onlyWithBalance: boolean;
  page: number;
  pageSize: number;
  generatedBy: { userId: string; email: string };
}

export class GetAccountStatementsSummaryUseCase {
  constructor(private readonly repo: AccountStatementRepository) {}

  async execute(
    req: GetAccountStatementsSummaryRequest
  ): Promise<AccountStatementSummaryResponseDto> {
    const result = await this.repo.summary(
      {
        branchId: req.branchId,
        search: req.search,
        from: req.from,
        to: req.to,
        onlyWithBalance: req.onlyWithBalance,
      },
      { page: req.page, pageSize: req.pageSize }
    );

    let totalCharged = new Decimal(0);
    let totalPaid = new Decimal(0);
    let totalBalance = new Decimal(0);

    const items: AccountStatementSummaryRowDto[] = result.items.map((row) => {
      const charged = new Decimal(row.totalCharged);
      const paid = new Decimal(row.totalPaid);
      const balance = new Decimal(row.currentBalance);

      totalCharged = totalCharged.plus(charged);
      totalPaid = totalPaid.plus(paid);
      totalBalance = totalBalance.plus(balance);

      const availableCredit =
        row.creditLimit === null
          ? null
          : new Decimal(row.creditLimit).minus(balance).toFixed(4);

      return {
        customerId: row.customerId,
        customerCode: row.customerCode,
        customerName: row.customerName,
        totalCharged: charged.toFixed(4),
        totalPaid: paid.toFixed(4),
        currentBalance: balance.toFixed(4),
        creditLimit: row.creditLimit === null ? null : new Decimal(row.creditLimit).toFixed(4),
        availableCredit,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      filters: {
        branchId: req.branchId,
        search: req.search,
        from: req.from ? req.from.toISOString().split("T")[0] : null,
        to: req.to ? req.to.toISOString().split("T")[0] : null,
        onlyWithBalance: req.onlyWithBalance,
      },
      items,
      totals: {
        customerCount: result.total,
        totalCharged: totalCharged.toFixed(4),
        totalPaid: totalPaid.toFixed(4),
        totalBalance: totalBalance.toFixed(4),
      },
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }
}
