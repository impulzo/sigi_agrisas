import { Decimal } from "decimal.js";
import { SalesByProductRepository } from "../ports/SalesByProductRepository";
import { SalesByProductDetailRow } from "../../domain/value-objects/SalesByProductFilters";
import {
  SalesByProductReportResponseDto,
  SalesByProductDetailRowDto,
} from "../dto/SalesByProductReportResponseDto";

const EXPORT_ROW_LIMIT = 10_000;

export interface GetSalesByProductReportRequest {
  branchId: string | null;
  departmentId: string | null;
  customerId: string | null;
  from: Date;
  to: Date;
  page: number;
  pageSize: number;
  forExport: boolean;
  generatedBy: { userId: string; email: string };
}

export interface GetSalesByProductReportResult {
  dto: SalesByProductReportResponseDto;
  tooLarge: boolean;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function money(n: number): string {
  return new Decimal(n).toFixed(4);
}

function rowDto(r: SalesByProductDetailRow): SalesByProductDetailRowDto {
  return {
    departmentId: r.departmentId,
    departmentName: r.departmentName,
    productId: r.productId,
    productCode: r.productCode,
    productName: r.productName,
    customerId: r.customerId,
    customerName: r.customerName,
    quantity: money(r.quantity),
    total: money(r.total),
  };
}

export class GetSalesByProductReportUseCase {
  constructor(private readonly repo: SalesByProductRepository) {}

  async execute(req: GetSalesByProductReportRequest): Promise<GetSalesByProductReportResult> {
    const filters = {
      branchId: req.branchId,
      departmentId: req.departmentId,
      customerId: req.customerId,
      from: req.from,
      to: req.to,
    };

    const page = req.forExport
      ? await this.repo.getPage(filters, 1, EXPORT_ROW_LIMIT + 1)
      : await this.repo.getPage(filters, req.page, req.pageSize);

    const tooLarge = req.forExport && page.rowsTotal > EXPORT_ROW_LIMIT;

    const dto: SalesByProductReportResponseDto = {
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
        ticketCount: page.totals.ticketCount,
        subtotal: money(page.totals.subtotal),
        taxTotal: money(page.totals.taxTotal),
        total: money(page.totals.total),
      },
      rows: page.rows.map(rowDto),
      rowsTotal: page.rowsTotal,
    };

    return { dto, tooLarge };
  }
}
