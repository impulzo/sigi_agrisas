import { ProviderPaymentRepository } from "../ports/ProviderPaymentRepository";
import { ProviderPaymentDto } from "../dto/ProviderPaymentDto";
import { toProviderPaymentDto } from "../mappers/toProviderPaymentDto";

export class ListProviderPaymentsByPurchaseUseCase {
  constructor(private readonly repo: ProviderPaymentRepository) {}

  async execute(purchaseId: string): Promise<ProviderPaymentDto[]> {
    const results = await this.repo.listByPurchase(purchaseId);
    return results.map((r) => toProviderPaymentDto(r.providerPayment, r.joined));
  }
}
