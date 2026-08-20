import { formatMoney as money } from "@/shared/domain/services/formatMoney";
import { ProviderPaymentReportRepository, ProviderPaymentsReportRow } from "../ports/ProviderPaymentReportRepository";
import { ProviderPaymentsReportResponseDto, ProviderPaymentsReportRowDto } from "../dto/ProviderPaymentsReportResponseDto";

const EXPORT_ROW_LIMIT = 10_000;

export interface GetProviderPaymentsReportRequest {
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

export interface GetProviderPaymentsReportResult {
  dto: ProviderPaymentsReportResponseDto;
  tooLarge: boolean;
}


function toRowDto(row: ProviderPaymentsReportRow): ProviderPaymentsReportRowDto {
  return {
    id: row.id,
    folioCode: row.folioCode,
    purchaseFolioCode: row.purchaseFolioCode,
    providerName: row.providerName,
    branchName: row.branchName,
    amount: money(row.amount),
    status: row.status,
    paidAt: row.paidAt.toISOString(),
    providerInitialBalance: row.providerInitialBalance === null ? null : money(row.providerInitialBalance),
    providerCurrentBalance: row.providerCurrentBalance === null ? null : money(row.providerCurrentBalance),
  };
}

export class GetProviderPaymentsReportUseCase {
  constructor(private readonly repo: ProviderPaymentReportRepository) {}

  async execute(req: GetProviderPaymentsReportRequest): Promise<GetProviderPaymentsReportResult> {
    const filters = {
      branchId: req.branchId,
      providerId: req.providerId,
      status: req.status,
      from: req.from,
      to: req.to,
    };

    const { items, total } = req.forExport
      ? await this.repo.findAll(filters, { page: 1, pageSize: EXPORT_ROW_LIMIT + 1 })
      : await this.repo.findAll(filters, { page: req.page, pageSize: req.pageSize });

    const tooLarge = req.forExport && total > EXPORT_ROW_LIMIT;

    const rows = items.map(toRowDto);
    const totalAmount = items.reduce((acc, r) => acc + r.amount, 0);

    const dto: ProviderPaymentsReportResponseDto = {
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
