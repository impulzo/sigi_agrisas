import { Decimal } from "decimal.js";
import { AccountStatementRepository } from "../ports/AccountStatementRepository";
import { AnticipoReceiptNotFoundError } from "../../domain/errors/AnticipoReceiptNotFoundError";
import { AnticipoReceiptResponseDto } from "../dto/AnticipoReceiptResponseDto";

export interface GetAnticipoReceiptRequest {
  customerId: string;
  paymentId: string;
  branchId: string | null;
  generatedBy: { userId: string; email: string };
}

export class GetAnticipoReceiptUseCase {
  constructor(private readonly repo: AccountStatementRepository) {}

  async execute(req: GetAnticipoReceiptRequest): Promise<AnticipoReceiptResponseDto> {
    const data = await this.repo.anticipoReceipt(
      req.customerId,
      req.paymentId,
      req.branchId
    );
    if (!data) throw new AnticipoReceiptNotFoundError(req.paymentId);

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      payment: {
        id: data.payment.id,
        folio: `${data.payment.folioCode}-${data.payment.folioNumber}`,
        folioCode: data.payment.folioCode,
        folioNumber: data.payment.folioNumber,
        amount: new Decimal(data.payment.amount).toFixed(4),
        status: data.payment.status,
        date: data.payment.createdAt.toISOString(),
        reference: data.payment.reference,
        paymentMethodCode: data.payment.paymentMethodCode,
        paymentMethodName: data.payment.paymentMethodName,
      },
      customer: {
        code: data.customer.code,
        name: data.customer.name,
        address: data.customer.address,
      },
      sale: { folio: `${data.sale.folioCode}-${data.sale.folioNumber}` },
    };
  }
}
