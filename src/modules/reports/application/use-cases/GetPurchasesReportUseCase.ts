import { formatMoney as money } from "@/shared/domain/services/formatMoney";
import { PurchaseRepository, PurchaseSummary } from "@/modules/purchases/application/ports/PurchaseRepository";
import { PurchasesReportResponseDto, PurchasesReportRowDto } from "../dto/PurchasesReportResponseDto";

const EXPORT_ROW_LIMIT = 10_000;

export interface GetPurchasesReportRequest {
  branchId: string | null;
  providerId: string | null;
  status: "completed" | "cancelled" | null;
  from: Date | null;
  to: Date | null;
  page: number;
  pageSize: number;
  forExport: boolean;
  generatedBy: { userId: string; email: string };
}

export interface GetPurchasesReportResult {
  dto: PurchasesReportResponseDto;
  tooLarge: boolean;
}


function toRowDto(row: PurchaseSummary): PurchasesReportRowDto {
  return {
    id: row.purchase.id,
    folioCode: row.purchase.folioCode,
    providerName: row.joined.providerName,
    branchName: row.joined.branchName,
    subtotal: money(row.purchase.subtotal),
    taxTotal: money(row.purchase.taxTotal),
    total: money(row.purchase.total),
    paidAmount: money(row.purchase.paidAmount),
    paymentStatus: row.purchase.paymentStatus,
    status: row.purchase.status,
    purchasedAt: row.purchase.purchasedAt.toISOString(),
  };
}

/** Reutiliza `PurchaseRepository` (módulo `purchases`) en vez de duplicar el query — ver design.md D1. */
export class GetPurchasesReportUseCase {
  constructor(private readonly purchaseRepo: PurchaseRepository) {}

  async execute(req: GetPurchasesReportRequest): Promise<GetPurchasesReportResult> {
    const opts = {
      branchId: req.branchId ?? undefined,
      providerId: req.providerId ?? undefined,
      statuses: req.status ? [req.status] : undefined,
      from: req.from ?? undefined,
      to: req.to ?? undefined,
    };

    const { items, total } = req.forExport
      ? await this.purchaseRepo.findAll({ ...opts, page: 1, pageSize: EXPORT_ROW_LIMIT + 1 })
      : await this.purchaseRepo.findAll({ ...opts, page: req.page, pageSize: req.pageSize });

    const tooLarge = req.forExport && total > EXPORT_ROW_LIMIT;

    const rows = items.map(toRowDto);
    const totalAmount = items.reduce((acc, r) => acc + r.purchase.total, 0);

    const dto: PurchasesReportResponseDto = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      filters: {
        branchId: req.branchId,
        providerId: req.providerId,
        status: req.status,
        from: req.from ? req.from.toISOString().split("T")[0] : null,
        to: req.to ? req.to.toISOString().split("T")[0] : null,
      },
      totals: { count: total, total: money(totalAmount) },
      rows,
    };

    return { dto, tooLarge };
  }
}
