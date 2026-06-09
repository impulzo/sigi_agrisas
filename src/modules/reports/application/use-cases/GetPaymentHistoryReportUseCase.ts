import { Decimal } from "decimal.js";
import { PaymentReportRepository } from "../ports/PaymentReportRepository";
import { GetPaymentHistoryReportRequest } from "../dto/GetPaymentHistoryReportRequest";
import { PaymentHistoryReportResponseDto, PaymentItemDto } from "../dto/PaymentHistoryReportResponseDto";

export class GetPaymentHistoryReportUseCase {
  constructor(private readonly repo: PaymentReportRepository) {}

  async execute(req: GetPaymentHistoryReportRequest): Promise<PaymentHistoryReportResponseDto> {
    const rows = await this.repo.findPayments({
      branchId: req.branchId ?? null,
      customerId: req.customerId ?? null,
      startDate: req.startDate ?? null,
      endDate: req.endDate ?? null,
    });

    let totalAmount = new Decimal(0);
    let cancelledAmount = new Decimal(0);
    let totalPayments = 0;
    let cancelledPayments = 0;

    const payments: PaymentItemDto[] = rows.map((row) => {
      if (row.status === "completed") {
        totalPayments++;
        totalAmount = totalAmount.plus(row.amount);
      } else if (row.status === "cancelled") {
        cancelledPayments++;
        cancelledAmount = cancelledAmount.plus(row.amount);
      }

      return {
        paymentId: row.paymentId,
        folioNumber: row.folioNumber,
        saleId: row.saleId,
        saleFolioNumber: row.saleFolioNumber,
        customerId: row.customerId,
        customerCode: row.customerCode,
        customerName: row.customerName,
        branchId: row.branchId,
        branchCode: row.branchCode,
        amount: row.amount.toFixed(4),
        paymentDate: row.paymentDate.toISOString(),
        status: row.status,
        registeredBy: row.registeredBy,
        registeredByEmail: row.registeredByEmail,
        cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
        cancellationReason: row.cancellationReason ?? null,
      };
    });

    const netAmount = totalAmount.minus(cancelledAmount);

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      filters: {
        branchId: req.branchId ?? null,
        customerId: req.customerId ?? null,
        startDate: req.startDate ? req.startDate.toISOString().split("T")[0] : null,
        endDate: req.endDate ? req.endDate.toISOString().split("T")[0] : null,
      },
      summary: {
        totalPayments,
        totalAmount: totalAmount.toFixed(4),
        cancelledPayments,
        cancelledAmount: cancelledAmount.toFixed(4),
        netAmount: netAmount.toFixed(4),
      },
      payments,
    };
  }
}
