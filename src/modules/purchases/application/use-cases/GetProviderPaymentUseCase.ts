import { ProviderPaymentRepository } from "../ports/ProviderPaymentRepository";
import { ProviderPaymentDetailDto } from "../dto/ProviderPaymentDto";
import { toProviderPaymentDetailDto } from "../mappers/toProviderPaymentDto";
import { ProviderPaymentNotFoundError } from "../../domain/errors/ProviderPaymentNotFoundError";

export interface GetProviderPaymentResult {
  dto: ProviderPaymentDetailDto;
  branchId: string;
}

export class GetProviderPaymentUseCase {
  constructor(private readonly repo: ProviderPaymentRepository) {}

  async execute(id: string): Promise<GetProviderPaymentResult> {
    const result = await this.repo.findById(id);
    if (!result) throw new ProviderPaymentNotFoundError();

    return {
      dto: toProviderPaymentDetailDto(result.providerPayment, result.joined, result.purchase),
      branchId: result.purchase.branchId,
    };
  }
}
