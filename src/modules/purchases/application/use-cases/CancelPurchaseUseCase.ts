import { PurchaseRepository } from "../ports/PurchaseRepository";
import { CancelPurchaseRequest, PurchaseDetailDto } from "../dto/PurchaseDto";
import { toPurchaseDetailDto } from "../mappers/toPurchaseDto";
import { PurchaseNotFoundError } from "../../domain/errors/PurchaseNotFoundError";
import { PurchaseAlreadyCancelledError } from "../../domain/errors/PurchaseAlreadyCancelledError";

export interface CancelPurchaseResult {
  dto: PurchaseDetailDto;
  branchId: string;
}

export class CancelPurchaseUseCase {
  constructor(private readonly purchaseRepo: PurchaseRepository) {}

  async execute(req: CancelPurchaseRequest): Promise<CancelPurchaseResult> {
    const existing = await this.purchaseRepo.findByIdWithItems(req.id);
    if (!existing) throw new PurchaseNotFoundError();
    if (!existing.purchase.canBeCancelled()) throw new PurchaseAlreadyCancelledError();

    const result = await this.purchaseRepo.cancel(req.id, req.cancelledBy, req.cancellationReason);

    return {
      dto: toPurchaseDetailDto(result.purchase, result.items, result.providerPayments, result.joined),
      branchId: result.purchase.branchId,
    };
  }
}
