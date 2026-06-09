import { PaymentRepository } from "../ports/PaymentRepository";
import { PaymentDetailDto } from "../dto/PaymentDto";
import { toPaymentDetailDto } from "../mappers/toPaymentDto";
import { PaymentNotFoundError } from "../../domain/errors/PaymentNotFoundError";

export interface CancelPaymentResult {
  dto: PaymentDetailDto;
  branchId: string;
}

export class CancelPaymentUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  async execute(id: string, reason: string | null, userId: string): Promise<CancelPaymentResult> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new PaymentNotFoundError(id);

    const result = await this.repo.markCancelled(id, reason, userId);

    const joined = {
      saleFolioCode: result.joins?.saleFolioCode ?? result.sale.folioCode,
      customerName: result.joins?.customerName ?? "",
      userName: result.joins?.userName ?? "",
      branchName: result.joins?.branchName ?? "",
      paymentMethodCode: result.joins?.paymentMethodCode ?? "",
    };

    return {
      dto: toPaymentDetailDto(result, joined),
      branchId: result.payment.branchId,
    };
  }
}
