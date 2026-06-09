import { PaymentMethodRepository } from "@/modules/payment-methods/application/ports/PaymentMethodRepository";
import { PaymentMethodDto, toPaymentMethodDto } from "@/modules/payment-methods/application/dto/PaymentMethodDto";
import { PaymentMethodNotFoundError } from "@/modules/payment-methods/domain/errors/PaymentMethodNotFoundError";

export class GetPaymentMethodUseCase {
  constructor(private readonly repo: PaymentMethodRepository) {}

  async execute(id: string): Promise<PaymentMethodDto> {
    const pm = await this.repo.findById(id);
    if (!pm) throw new PaymentMethodNotFoundError();
    return toPaymentMethodDto(pm);
  }
}
