import { PurchaseRepository } from "../ports/PurchaseRepository";
import { PurchaseDetailDto } from "../dto/PurchaseDto";
import { toPurchaseDetailDto } from "../mappers/toPurchaseDto";
import { PurchaseNotFoundError } from "../../domain/errors/PurchaseNotFoundError";

export interface GetPurchaseResult {
  dto: PurchaseDetailDto;
  branchId: string;
}

export class GetPurchaseUseCase {
  constructor(private readonly purchaseRepo: PurchaseRepository) {}

  async execute(id: string): Promise<GetPurchaseResult> {
    const result = await this.purchaseRepo.findByIdWithItems(id);
    if (!result) throw new PurchaseNotFoundError();

    return {
      dto: toPurchaseDetailDto(result.purchase, result.items, result.providerPayments, result.joined),
      branchId: result.purchase.branchId,
    };
  }
}
