import { ProviderPaymentRepository } from "../ports/ProviderPaymentRepository";
import { CancelProviderPaymentRequest, ProviderPaymentDetailDto } from "../dto/ProviderPaymentDto";
import { toProviderPaymentDetailDto } from "../mappers/toProviderPaymentDto";
import { ProviderPaymentNotFoundError } from "../../domain/errors/ProviderPaymentNotFoundError";

export interface CancelProviderPaymentResult {
  dto: ProviderPaymentDetailDto;
  branchId: string;
}

export class CancelProviderPaymentUseCase {
  constructor(private readonly repo: ProviderPaymentRepository) {}

  async execute(req: CancelProviderPaymentRequest): Promise<CancelProviderPaymentResult> {
    const existing = await this.repo.findById(req.id);
    if (!existing) throw new ProviderPaymentNotFoundError();

    const result = await this.repo.markCancelled(req.id, req.cancelledBy, req.cancellationReason);

    return {
      dto: toProviderPaymentDetailDto(result.providerPayment, result.joined, result.purchase),
      branchId: result.purchase.branchId,
    };
  }
}
