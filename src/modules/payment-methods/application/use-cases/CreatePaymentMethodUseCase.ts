import { PaymentMethodRepository, CreatePaymentMethodData } from "@/modules/payment-methods/application/ports/PaymentMethodRepository";
import { PaymentMethodDto, toPaymentMethodDto } from "@/modules/payment-methods/application/dto/PaymentMethodDto";

export class CreatePaymentMethodUseCase {
  constructor(private readonly repo: PaymentMethodRepository) {}

  async execute(data: CreatePaymentMethodData): Promise<PaymentMethodDto> {
    const pm = await this.repo.create(data);
    return toPaymentMethodDto(pm);
  }
}
