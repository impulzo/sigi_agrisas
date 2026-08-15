import { formatMoney as money } from "@/shared/domain/services/formatMoney";
import { CashCutRepository } from "../ports/CashCutRepository";
import { CashCutAssembler, AssembledCashCutRow, CashCutPaymentMethodBreakdownRow } from "../../domain/services/CashCutAssembler";
import {
  CashCutReportResponseDto,
  CashCutRowDto,
  CashCutPaymentMethodBreakdownDto,
} from "../dto/CashCutReportResponseDto";

export interface GetCashCutReportRequest {
  branchId: string | null;
  customerId: string | null;
  paymentMethodId: string | null;
  from: Date;
  to: Date;
  generatedBy: { userId: string; email: string };
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}


function rowDto(r: AssembledCashCutRow): CashCutRowDto {
  return {
    paymentId: r.paymentId,
    customerCode: r.customerCode,
    docto: r.docto,
    factura: r.factura,
    customerName: r.customerName,
    facturaDate: toDateStr(r.facturaDate),
    days: r.days,
    amount: money(r.amount),
    paymentMethodCode: r.paymentMethodCode,
    paymentMethodName: r.paymentMethodName,
    reference: r.reference,
    collectedAt: r.collectedAt.toISOString(),
    ivaAmount: money(r.ivaAmount),
    taxRatePct: money(r.taxRatePct),
  };
}

function breakdownDto(r: CashCutPaymentMethodBreakdownRow): CashCutPaymentMethodBreakdownDto {
  return {
    paymentMethodId: r.paymentMethodId,
    code: r.code,
    label: r.label,
    count: r.count,
    total: money(r.total),
  };
}

export class GetCashCutReportUseCase {
  constructor(private readonly repo: CashCutRepository) {}

  async execute(req: GetCashCutReportRequest): Promise<CashCutReportResponseDto> {
    const rawRows = await this.repo.findRows({
      branchId: req.branchId,
      customerId: req.customerId,
      paymentMethodId: req.paymentMethodId,
      from: req.from,
      to: req.to,
    });

    const cut = CashCutAssembler.assemble(rawRows);

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      filters: {
        branchId: req.branchId,
        customerId: req.customerId,
        paymentMethodId: req.paymentMethodId,
        from: toDateStr(req.from),
        to: toDateStr(req.to),
      },
      totals: {
        totalCollected: money(cut.totals.totalCollected),
        totalIva: money(cut.totals.totalIva),
      },
      byPaymentMethod: cut.byPaymentMethod.map(breakdownDto),
      rows: cut.rows.map(rowDto),
    };
  }
}
