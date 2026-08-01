import { Decimal } from "decimal.js";
import { SalesCutRepository } from "../ports/SalesCutRepository";
import { SalesCutAssembler } from "../../domain/services/SalesCutAssembler";
import { BreakdownRow } from "../../domain/value-objects/SalesCutFilters";
import {
  SalesCutReportResponseDto,
  SalesCutBreakdownRowDto,
} from "../dto/SalesCutReportResponseDto";

export interface GetSalesCutReportRequest {
  branchId: string | null;
  cashierId: string | null;
  paymentMethodId: string | null;
  from: Date;
  to: Date;
  generatedBy: { userId: string; email: string };
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function money(n: number): string {
  return new Decimal(n).toFixed(4);
}

function rowDto(r: BreakdownRow): SalesCutBreakdownRowDto {
  return {
    key: r.key,
    label: r.label,
    ticketCount: r.ticketCount,
    subtotal: money(r.subtotal),
    taxTotal: money(r.taxTotal),
    total: money(r.total),
  };
}

export class GetSalesCutReportUseCase {
  constructor(private readonly repo: SalesCutRepository) {}

  async execute(req: GetSalesCutReportRequest): Promise<SalesCutReportResponseDto> {
    const agg = await this.repo.getAggregates({
      branchId: req.branchId,
      cashierId: req.cashierId,
      paymentMethodId: req.paymentMethodId,
      from: req.from,
      to: req.to,
    });

    const cut = SalesCutAssembler.assemble(agg);

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      filters: {
        branchId: req.branchId,
        cashierId: req.cashierId,
        paymentMethodId: req.paymentMethodId,
        from: toDateStr(req.from),
        to: toDateStr(req.to),
      },
      totals: {
        grossSales: money(cut.totals.grossSales),
        ticketCount: cut.totals.ticketCount,
        subtotal: money(cut.totals.subtotal),
        taxTotal: money(cut.totals.taxTotal),
        ivaTotal: money(cut.totals.ivaTotal),
        iepsTotal: money(cut.totals.iepsTotal),
      },
      cancelled: {
        count: cut.cancelled.count,
        total: money(cut.cancelled.total),
      },
      cash: {
        grossSales: money(cut.cash.grossSales),
        paymentsReceived: money(cut.cash.paymentsReceived),
        returnsRefunded: money(cut.cash.returnsRefunded),
        netCash: money(cut.cash.netCash),
      },
      byPaymentMethod: cut.byPaymentMethod.map(rowDto),
      byDay: cut.byDay.map(rowDto),
      byCashier: cut.byCashier.map(rowDto),
      byBranch: cut.byBranch.map(rowDto),
    };
  }
}
