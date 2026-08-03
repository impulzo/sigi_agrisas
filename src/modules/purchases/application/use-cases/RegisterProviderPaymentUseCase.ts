import { ProviderPaymentRepository, CreateProviderPaymentData } from "../ports/ProviderPaymentRepository";
import { RegisterProviderPaymentRequest, ProviderPaymentDetailDto } from "../dto/ProviderPaymentDto";
import { toProviderPaymentDetailDto } from "../mappers/toProviderPaymentDto";

export interface RegisterProviderPaymentResult {
  dto: ProviderPaymentDetailDto;
  branchId: string;
}

export class RegisterProviderPaymentUseCase {
  constructor(private readonly repo: ProviderPaymentRepository) {}

  async execute(req: RegisterProviderPaymentRequest): Promise<RegisterProviderPaymentResult> {
    const data: CreateProviderPaymentData = {
      purchaseId: req.purchaseId,
      creatorId: req.creatorId,
      amount: req.amount,
      notes: req.notes ?? null,
    };

    const result = await this.repo.createCompleted(data);

    return {
      dto: toProviderPaymentDetailDto(result.providerPayment, result.joined, result.purchase),
      branchId: result.purchase.branchId,
    };
  }
}
