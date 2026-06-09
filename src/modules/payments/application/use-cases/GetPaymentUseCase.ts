import { PaymentRepository, PaymentWithSale } from "../ports/PaymentRepository";
import { PaymentNotFoundError } from "../../domain/errors/PaymentNotFoundError";

export class GetPaymentUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  async execute(id: string): Promise<{ data: PaymentWithSale; branchId: string }> {
    const result = await this.repo.findById(id);
    if (!result) throw new PaymentNotFoundError(id);
    return { data: result, branchId: result.payment.branchId };
  }
}
