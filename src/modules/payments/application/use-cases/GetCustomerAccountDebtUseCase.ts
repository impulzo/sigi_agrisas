import { PaymentRepository } from "../ports/PaymentRepository";
import { AccountDebtDto } from "../dto/PaymentDto";
import { toAccountDebtDto } from "../mappers/toPaymentDto";

export interface GetCustomerAccountDebtRequest {
  customerId: string;
  /** Resolved effective branchId (via resolveScopedBranchId at the controller); null = all branches (bypass only). */
  branchId: string | null;
}

export class GetCustomerAccountDebtUseCase {
  constructor(private readonly repo: PaymentRepository) {}

  async execute(req: GetCustomerAccountDebtRequest): Promise<AccountDebtDto> {
    const summary = await this.repo.getAccountDebt(req.customerId, req.branchId);
    return toAccountDebtDto(summary);
  }
}
