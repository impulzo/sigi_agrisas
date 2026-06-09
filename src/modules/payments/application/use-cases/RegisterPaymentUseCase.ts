import { PaymentRepository, CreatePaymentInput } from "../ports/PaymentRepository";
import { PaymentDetailDto } from "../dto/PaymentDto";
import { toPaymentDetailDto } from "../mappers/toPaymentDto";

export interface RegisterPaymentRequest {
  saleId: string;
  paymentMethodId: string;
  folioId: string;
  amount: number;
  notes?: string | null;
  userId: string;
  /** null = caller has branches:access_all bypass */
  callerBranchId: string | null;
}

export interface RegisterPaymentResult {
  dto: PaymentDetailDto;
  branchId: string;
}

export class RegisterPaymentUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  async execute(req: RegisterPaymentRequest): Promise<RegisterPaymentResult> {
    const input: CreatePaymentInput = {
      saleId: req.saleId,
      customerId: "",
      userId: req.userId,
      branchId: "",
      paymentMethodId: req.paymentMethodId,
      folioId: req.folioId,
      amount: req.amount,
      notes: req.notes ?? null,
      callerBranchId: req.callerBranchId,
    };

    const result = await this.repo.createCompleted(input);

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
