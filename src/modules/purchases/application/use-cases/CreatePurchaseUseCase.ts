import { PurchaseRepository, CreatePurchaseData } from "../ports/PurchaseRepository";
import { CreatePurchaseRequest, PurchaseDetailDto } from "../dto/PurchaseDto";
import { toPurchaseDetailDto } from "../mappers/toPurchaseDto";
import { PurchaseItemsEmptyError } from "../../domain/errors/PurchaseItemsEmptyError";

export interface CreatePurchaseResult {
  dto: PurchaseDetailDto;
  branchId: string;
}

export class CreatePurchaseUseCase {
  constructor(private readonly purchaseRepo: PurchaseRepository) {}

  async execute(req: CreatePurchaseRequest): Promise<CreatePurchaseResult> {
    if (!req.items || req.items.length === 0) {
      throw new PurchaseItemsEmptyError();
    }

    const data: CreatePurchaseData = {
      providerId: req.providerId,
      branchId: req.branchId,
      paymentMethodId: req.paymentMethodId,
      creatorId: req.creatorId,
      notes: req.notes ?? null,
      items: req.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        discountPct: item.discountPct ?? null,
      })),
    };

    const result = await this.purchaseRepo.createCompleted(data);

    return {
      dto: toPurchaseDetailDto(result.purchase, result.items, result.providerPayments, result.joined),
      branchId: result.purchase.branchId,
    };
  }
}
