import { Decimal } from "decimal.js";
import { CashCutRepository } from "../ports/CashCutRepository";
import {
  CollectionsAssembler,
  AssembledCollectionsRow,
  CollectionsByCustomerRow,
  CollectionsByTicketRow,
} from "../../domain/services/CollectionsAssembler";
import {
  CollectionsReportResponseDto,
  CollectionsRowDto,
  CollectionsByCustomerRowDto,
  CollectionsByTicketRowDto,
} from "../dto/CollectionsReportResponseDto";

export interface GetCollectionsReportRequest {
  branchId: string | null;
  customerId: string | null;
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

function rowDto(r: AssembledCollectionsRow): CollectionsRowDto {
  return {
    paymentId: r.paymentId,
    saleId: r.saleId,
    customerId: r.customerId,
    customerCode: r.customerCode,
    customerName: r.customerName,
    factura: r.factura,
    amount: money(r.amount),
    paymentMethodName: r.paymentMethodName,
    reference: r.reference,
    collectedAt: r.collectedAt.toISOString(),
  };
}

function byCustomerDto(r: CollectionsByCustomerRow): CollectionsByCustomerRowDto {
  return { ...r, total: money(r.total) };
}

function byTicketDto(r: CollectionsByTicketRow): CollectionsByTicketRowDto {
  return { ...r, total: money(r.total) };
}

/** Reusa `CashCutRepository` (mismo repo que `GetCashCutReportUseCase`) — ver design.md D3. */
export class GetCollectionsReportUseCase {
  constructor(private readonly repo: CashCutRepository) {}

  async execute(req: GetCollectionsReportRequest): Promise<CollectionsReportResponseDto> {
    const rawRows = await this.repo.findRows({
      branchId: req.branchId,
      customerId: req.customerId,
      paymentMethodId: null,
      from: req.from,
      to: req.to,
    });

    const assembled = CollectionsAssembler.assemble(rawRows);

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      filters: {
        branchId: req.branchId,
        customerId: req.customerId,
        from: toDateStr(req.from),
        to: toDateStr(req.to),
      },
      totals: { totalCollected: money(assembled.totals.totalCollected) },
      rows: assembled.rows.map(rowDto),
      byCustomer: assembled.byCustomer.map(byCustomerDto),
      byTicket: assembled.byTicket.map(byTicketDto),
    };
  }
}
