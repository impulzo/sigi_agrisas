import { SaleRepository } from "../ports/SaleRepository";
import { CancelSaleRequest } from "../dto/CancelSaleRequest";
import { SaleDetailDto } from "../dto/SaleDto";
import { toSaleDetailDto } from "../mappers/toSaleDto";
import { SaleNotFoundError } from "../../domain/errors/SaleNotFoundError";
import { ReturnedTotalSaleNotCancellableError } from "../../domain/errors/ReturnedTotalSaleNotCancellableError";
import type { AdminNotificationService } from "@/shared/application/services/AdminNotificationService";

export interface CancelSaleResult {
  dto: SaleDetailDto;
  branchId: string;
}

export class CancelSaleUseCase {
  constructor(
    private readonly repo: SaleRepository,
    private readonly notifier?: AdminNotificationService
  ) {}

  async execute(id: string, req: CancelSaleRequest): Promise<CancelSaleResult> {
    const existing = await this.repo.findByIdWithItems(id);
    if (!existing) throw new SaleNotFoundError(id);
    if (existing.sale.status === "returned_total") throw new ReturnedTotalSaleNotCancellableError();
    const summary = await this.repo.cancel(id, req.reason ?? null);

    if (this.notifier) {
      try {
        await this.notifier.notifySaleCancelled({
          folioCode: summary.sale.folioCode,
          total: summary.sale.total,
          cancellationReason: summary.sale.cancellationReason,
          branchName: summary.joined.branchName ?? summary.sale.branchId,
          cashierName: summary.joined.cashierName ?? summary.sale.cashierId,
        });
      } catch (err) {
        // Defense in depth: AdminNotificationService already swallows its own errors,
        // but the cancellation itself must never fail because of a notification issue.
        console.error("[CancelSaleUseCase] Notification failed but cancellation already committed:", err);
      }
    }

    return {
      dto: toSaleDetailDto(summary.sale, summary.joined),
      branchId: summary.sale.branchId,
    };
  }
}
