import { PaymentRepository, CreateAccountPaymentInput } from "../ports/PaymentRepository";
import { PaymentDetailDto } from "../dto/PaymentDto";
import { toPaymentDetailDto } from "../mappers/toPaymentDto";

export interface RegisterAccountPaymentRequest {
  customerId: string;
  paymentMethodId: string;
  folioId: string;
  amount: number;
  notes?: string | null;
  userId: string;
  /** Resolved effective branchId (via resolveScopedBranchId at the controller). */
  branchId: string;
}

export interface RegisterAccountPaymentResult {
  dto: PaymentDetailDto;
  branchId: string;
}

export class RegisterAccountPaymentUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  async execute(req: RegisterAccountPaymentRequest): Promise<RegisterAccountPaymentResult> {
    const input: CreateAccountPaymentInput = {
      customerId: req.customerId,
      userId: req.userId,
      paymentMethodId: req.paymentMethodId,
      folioId: req.folioId,
      amount: req.amount,
      notes: req.notes ?? null,
      branchId: req.branchId,
    };

    const result = await this.repo.createAccountCompleted(input);

    const joined = {
      saleFolioCode: result.joins?.saleFolioCode ?? null,
      customerName: result.joins?.customerName ?? "",
      userName: result.joins?.userName ?? "",
      branchName: result.joins?.branchName ?? "",
      paymentMethodCode: result.joins?.paymentMethodCode ?? "",
      saleTotal: result.joins?.saleTotal ?? null,
      salePaidAmount: result.joins?.salePaidAmount ?? null,
      salePaymentStatus: result.joins?.salePaymentStatus ?? null,
    };

    return {
      dto: toPaymentDetailDto(result, joined),
      branchId: result.payment.branchId,
    };
  }
}
