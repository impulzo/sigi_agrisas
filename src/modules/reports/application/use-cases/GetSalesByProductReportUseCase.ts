import { Decimal } from "decimal.js";
import { SalesByProductRepository } from "../ports/SalesByProductRepository";
import { SalesByProductAssembler } from "../../domain/services/SalesByProductAssembler";
import { SalesByProductBreakdownRow, SalesByProductRow } from "../../domain/value-objects/SalesByProductFilters";
import {
  SalesByProductReportResponseDto,
  SalesByProductBreakdownRowDto,
  SalesByProductRowDto,
} from "../dto/SalesByProductReportResponseDto";

export interface GetSalesByProductReportRequest {
  branchId: string | null;
  departmentId: string | null;
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

function rowDto(r: SalesByProductBreakdownRow): SalesByProductBreakdownRowDto {
  return {
    key: r.key,
    label: r.label,
    ticketCount: r.ticketCount,
    subtotal: money(r.subtotal),
    taxTotal: money(r.taxTotal),
    total: money(r.total),
  };
}

function productRowDto(r: SalesByProductRow): SalesByProductRowDto {
  return { ...rowDto(r), quantitySold: money(r.quantitySold), currentStock: r.currentStock };
}

export class GetSalesByProductReportUseCase {
  constructor(private readonly repo: SalesByProductRepository) {}

  async execute(req: GetSalesByProductReportRequest): Promise<SalesByProductReportResponseDto> {
    const agg = await this.repo.getAggregates({
      branchId: req.branchId,
      departmentId: req.departmentId,
      customerId: req.customerId,
      from: req.from,
      to: req.to,
    });

    const assembled = SalesByProductAssembler.assemble(agg);

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      filters: {
        branchId: req.branchId,
        departmentId: req.departmentId,
        customerId: req.customerId,
        from: toDateStr(req.from),
        to: toDateStr(req.to),
      },
      totals: {
        ticketCount: assembled.totals.ticketCount,
        subtotal: money(assembled.totals.subtotal),
        taxTotal: money(assembled.totals.taxTotal),
        total: money(assembled.totals.total),
      },
      byCustomer: assembled.byCustomer.map(rowDto),
      byDepartment: assembled.byDepartment.map(rowDto),
      byProduct: assembled.byProduct.map(productRowDto),
    };
  }
}
