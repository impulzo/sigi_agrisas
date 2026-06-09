import { PaymentMethodRepository, UpdatePaymentMethodData } from "@/modules/payment-methods/application/ports/PaymentMethodRepository";
import { PaymentMethodDto, toPaymentMethodDto } from "@/modules/payment-methods/application/dto/PaymentMethodDto";

export interface UpdatePaymentMethodRequest extends UpdatePaymentMethodData {
  id: string;
}

export class UpdatePaymentMethodUseCase {
  constructor(private readonly repo: PaymentMethodRepository) {}

  async execute(req: UpdatePaymentMethodRequest): Promise<PaymentMethodDto> {
    const { id, ...data } = req;
    const pm = await this.repo.update(id, data);
    return toPaymentMethodDto(pm);
  }
}
