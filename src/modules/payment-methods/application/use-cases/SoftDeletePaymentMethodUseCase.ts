import { PaymentMethodRepository } from "@/modules/payment-methods/application/ports/PaymentMethodRepository";

export class SoftDeletePaymentMethodUseCase {
  constructor(private readonly repo: PaymentMethodRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
